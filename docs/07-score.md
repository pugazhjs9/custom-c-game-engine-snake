# 07 — Score: Persistence with Raw POSIX I/O

> **In one sentence:** We save high scores to disk using `open`, `read`, `write`, and `close` — the **system calls** that `fopen`/`fprintf` are built on top of — so we never need `<stdio.h>` for file I/O.

---

## What is "POSIX I/O"?

Two layers:

| Layer | Header | Functions |
|---|---|---|
| **High level** (buffered, formatted) | `<stdio.h>` | `fopen`, `fprintf`, `fscanf`, `fclose` |
| **Low level** (raw syscalls) | `<unistd.h>` + `<fcntl.h>` | `open`, `read`, `write`, `close` |

`fopen` is just a wrapper around `open` that adds a buffer and formatted I/O. We're using the layer underneath. **Same file, no fluff.**

---

## How files are referenced

In `<stdio.h>`, you get a `FILE *` (an opaque struct). In POSIX, you get an **integer file descriptor**:

```
fd = 0  →  stdin
fd = 1  →  stdout
fd = 2  →  stderr
fd = 3  →  first file you open
fd = 4  →  next file...
```

The OS keeps a table of open files in your process; the int is just an index into it.

---

## Public API

```c
int  score_load(const char *mode_tag);              // returns 0 if no file
void score_save(const char *mode_tag, int score);   // truncate-and-write
```

`mode_tag` is a string like `"easy"`, `"normal"`, `"ai"`, `"multi"` — one save file per mode/difficulty.

---

## File layout on disk

Each file lives in the working directory:
```
.snake_highscore_easy
.snake_highscore_normal
.snake_highscore_hard
.snake_highscore_ai
.snake_highscore_multi
```

The contents are **plain ASCII** — just the number written as text:
```
$ cat .snake_highscore_normal
17
```

That's it. Three bytes for a score of 17. We use `int_to_str` from [`04-string.md`](04-string.md) to convert.

---

## `build_path` — assemble the filename

```c
#define PATH_PREFIX ".snake_highscore_"
#define MAX_PATH    64

static void build_path(char *out, const char *mode_tag) {
    str_concat(out, PATH_PREFIX, mode_tag ? mode_tag : "default");
}
```

Concatenate `".snake_highscore_"` + `"normal"` → `".snake_highscore_normal"`. Note we use **our own** `str_concat` from `string.c` — no `strcat` from `<string.h>`.

---

## `score_load` — read the file

```c
int score_load(const char *mode_tag) {
    char path[MAX_PATH];
    char buf[32];
    int  fd, n;

    build_path(path, mode_tag);

    fd = open(path, O_RDONLY);              // (1) open for reading
    if (fd < 0) return 0;                   // file doesn't exist → no score yet

    n = (int)read(fd, buf, (int)sizeof(buf) - 1);   // (2) read up to 31 bytes
    close(fd);                              // (3) always close

    if (n <= 0) return 0;
    buf[n] = '\0';                          // (4) null-terminate
    return str_to_int(buf);                 // (5) parse decimal digits
}
```

(1) `open(path, O_RDONLY)` — returns `fd` or **`-1`** if anything went wrong (file not found, no permission, etc.). The `< 0` check covers all errors with one branch.

(2) `read(fd, buf, n)` — read up to `n` bytes into `buf`. Returns the actual count read (could be less than `n` if the file is smaller, or `0` at EOF).

(4) `read` does **not** null-terminate. It just dumps bytes. We add the `\0` so `str_to_int` knows where the digits end.

(5) Parse: `"17\n"` → 17.

### Diagram

```
disk:  .snake_highscore_normal       ←── path
       ┌─────────────────┐
       │  '1' '7' '\n'   │           3 bytes
       └─────────────────┘
                 │ open + read
                 ▼
   buf:   ┌─┬─┬──┬───┬────────┐
          │1│7│\n│\0 │   ...  │
          └─┴─┴──┴───┴────────┘
                 │ str_to_int
                 ▼
              17  ← integer returned
```

---

## `score_save` — write the file

```c
void score_save(const char *mode_tag, int score) {
    char path[MAX_PATH];
    char buf[32];
    int  fd, len;

    if (score < 0) score = 0;                       // sanity

    build_path(path, mode_tag);
    int_to_str(score, buf, (int)sizeof(buf));       // (1) integer → ASCII
    len = str_len(buf);

    fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);   // (2) open / truncate
    if (fd < 0) return;                             // can't open? give up silently

    write(fd, buf, (unsigned)len);                  // (3) write bytes
    close(fd);
}
```

(1) Convert the int to a decimal string in our own buffer (e.g., `423` → `"423"`).

(2) The flags:
- `O_WRONLY` — write only
- `O_CREAT` — create if not exists
- `O_TRUNC` — if it exists, truncate to zero bytes first (so we don't leave old digits hanging around)
- `0644` — POSIX permission bits: `rw-r--r--` (owner reads/writes, others read)

(3) `write(fd, buf, len)` — write `len` bytes from `buf` to the file descriptor. Returns the count actually written.

---

## Why no buffering / `fflush`?

`write()` is a direct syscall — bytes hit the kernel's file cache immediately. You don't need to flush. (The kernel will eventually persist to disk; if the machine loses power between the syscall and disk persistence, you might lose the score, but that's a separate problem and `fopen` has it too.)

---

## Where it's wired in (from `main.c`)

```c
// at session start:
game->loaded_high_score = score_load(game_score_tag(game));
game->high_score = game->loaded_high_score;

// at game over:
static void persist_highscore(Game *g) {
    int s = g->p1.score;
    if (g->mode == MODE_MULTI && g->p2.score > s) s = g->p2.score;
    if (s > g->loaded_high_score) {
        g->loaded_high_score = s;
        score_save(game_score_tag(g), s);   // only save if it's a new record
    }
}
```

`game_score_tag` (defined in `game.c`) returns the right string:
- Single Player → `"easy"` / `"normal"` / `"hard"`
- AI mode → `"ai"`
- 2-Player → `"multi"`

So each mode gets its own high-score file. Compare your AI's record vs your manual record!

---

## Bonus: why this approach is interesting

`fopen` is *easier* but **adds a layer**: a `FILE` struct, an internal buffer, format-string parsing, locale handling, etc. By going to the syscall level we:

1. **Understand exactly** what's happening — bytes go straight to the kernel.
2. **No <stdio.h>** as a dependency — meets the project's "no stdlib helpers" goal.
3. **Smaller binary** — no formatted I/O machinery linked in. (A real-world reason for embedded systems.)

---

## 📢 Presentation Script — "Score persistence"

> "We save high scores without ever using `fprintf` or `<stdio.h>`. We use the **system calls underneath**: `open`, `read`, `write`, `close` from `unistd.h` and `fcntl.h`.
>
> The save path is dead simple: convert the score integer to a decimal string with our own `int_to_str`, open the file with `O_WRONLY | O_CREAT | O_TRUNC`, write the bytes, close. The file just contains, say, `'1', '7', '\\n'` — that's it.
>
> Loading is the reverse: open read-only, read up to 31 bytes into a buffer, null-terminate, parse with our own `str_to_int`. If the file doesn't exist, we just return 0 — there's no high score yet.
>
> Each mode and difficulty gets its own file, so you can have separate records for Easy, Normal, Hard, AI, and 2-Player. The whole module is **70 lines**."

---

✅ Next: [`08-game.md`](08-game.md) — the heart of the snake.
