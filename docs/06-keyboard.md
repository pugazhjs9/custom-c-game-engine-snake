# 06 — Keyboard: Non-Blocking Raw-Mode Input

> **In one sentence:** Normally `read()` from the keyboard waits for Enter; we use `termios` to switch the terminal into **raw mode** so we get every key the moment it's pressed, and `fcntl` to make `read()` **non-blocking** so the game loop never pauses.

---

## The problem

Default terminal behavior is **cooked mode** — it lets you type, edit (backspace, etc.), then sends the **whole line** to your program when you press Enter. Plus, `read()` **blocks** until input arrives.

For a game that needs to:
- Detect a single key the moment it's pressed
- Keep moving the snake even when no key is pressed

…that default is useless. We need:

1. **Raw mode** — give us each key immediately, no line buffering, no echo.
2. **Non-blocking** — `read()` should return immediately if no key is waiting.

Both are configured **per file descriptor**. We modify stdin (fd `0`).

---

## Public API

```c
#define KEY_NONE   0
#define KEY_UP     128       // chosen outside ASCII so they can't collide
#define KEY_DOWN   129
#define KEY_LEFT   130
#define KEY_RIGHT  131
#define KEY_ENTER  10
#define KEY_CR     13
#define KEY_ESC    27

void kb_init(void);
void kb_cleanup(void);
int  keyPressed(void);    // 1 if a key is in the buffer
int  readKey(void);       // returns key code (KEY_* constant or ASCII)
```

---

## `kb_init` — flip into raw mode

```c
static struct termios orig_termios;
static int            orig_flags;
static unsigned char  last_key;

void kb_init(void) {
    struct termios raw;

    tcgetattr(STDIN_FILENO, &orig_termios);     // (1) save current settings

    raw = orig_termios;
    raw.c_lflag &= ~(ICANON | ECHO);            // (2) raw + no-echo
    raw.c_cc[VMIN]  = 0;
    raw.c_cc[VTIME] = 0;                        // (3) read returns immediately
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);

    orig_flags = fcntl(STDIN_FILENO, F_GETFL, 0);
    fcntl(STDIN_FILENO, F_SETFL, orig_flags | O_NONBLOCK);   // (4) non-blocking

    last_key = 0;
}
```

(1) **Always save and restore** terminal settings. Without this, if your program crashes the user's terminal is broken until they type `reset` blindly.

(2) Two flags in `c_lflag`:
- `ICANON` — canonical (line) mode. We disable it → raw mode.
- `ECHO` — auto-print typed chars. We disable it.

`&= ~X` is the C idiom for "turn off bit X". (`|=` turns on; `&= ~` turns off.)

(3) `VMIN=0, VTIME=0` — `read()` returns immediately, even if no bytes are available.

(4) `O_NONBLOCK` — when `read()` finds the buffer empty, it returns `-1` with `errno=EAGAIN` instead of blocking forever.

### `kb_cleanup` — restore everything

```c
void kb_cleanup(void) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
    fcntl(STDIN_FILENO, F_SETFL, orig_flags);
}
```

Match every change made in `kb_init`.

---

## `keyPressed` and `readKey` — peek and pop

We use a 1-byte stash (`last_key`) so a single byte can be **previewed** by `keyPressed` and then **consumed** by `readKey`.

### `keyPressed` — is there a byte waiting?

```c
int keyPressed(void) {
    if (last_key != 0) return 1;                       // already stashed
    if ((int)read(STDIN_FILENO, &last_key, 1) > 0)     // try to read 1 byte
        return 1;
    return 0;
}
```

Returns 1 if we have a byte to consume, 0 otherwise. The byte gets stashed in `last_key`.

### `readKey` — return the key code, decoding arrows

This is where the cleverness lives.

```c
int readKey(void) {
    int  key = (int)last_key;
    char seq[2];
    last_key = 0;

    if (key == 27) {                          // ESC byte → maybe an arrow?
        if (read(STDIN_FILENO, &seq[0], 1) == 1) {
            if (read(STDIN_FILENO, &seq[1], 1) == 1) {
                if (seq[0] == '[') {
                    switch (seq[1]) {
                        case 'A': return KEY_UP;
                        case 'B': return KEY_DOWN;
                        case 'C': return KEY_RIGHT;
                        case 'D': return KEY_LEFT;
                        default:  return KEY_ESC;
                    }
                }
            }
        }
        return KEY_ESC;
    }
    return key;
}
```

### Why is this so complicated?

**Arrow keys don't have single byte codes.** When you press the up arrow, the terminal sends **3 bytes**:

```
ESC  [  A         →   bytes:  0x1B  0x5B  0x41
```

This sequence is called **CSI A**. So when we see `0x1B` (`27`), we read **two more bytes** and check if it's `[A` / `[B` / `[C` / `[D`. If yes, we return our custom `KEY_UP`/`KEY_DOWN`/etc. constants (defined as 128–131, **outside ASCII** so they can't be confused with letters).

If the second byte isn't `[`, it was probably just a bare ESC press — we return `KEY_ESC`.

### Diagram — what one keypress looks like

```
User presses ↑ (up arrow):
   bytes arrive: 0x1B  0x5B  0x41
                  │     │     │
                  ▼     ▼     ▼
   keyPressed → reads 0x1B, stashes it, returns 1
   readKey    → consumes 0x1B, sees it's ESC
              → reads 0x5B, sees '['
              → reads 0x41, sees 'A'
              → returns KEY_UP (128)
```

For a regular letter:
```
User presses 'w':
   bytes arrive: 0x77
   keyPressed → reads 0x77, stashes, returns 1
   readKey    → consumes 0x77 (≠ 27), returns 'w' as int
```

---

## Why we need distinct codes for arrows (not just remapping to WASD)

In **2-player mode**, P1 uses WASD and P2 uses arrows. If arrow keys mapped back to WASD, the game couldn't tell P1 from P2! That's why `KEY_UP = 128` is **outside the ASCII range** — guaranteed not to collide with any letter.

This was a key fix during development:
> *"`keyboard.c` now returns distinct codes for arrow keys (`KEY_UP/DOWN/LEFT/RIGHT` = 128–131) instead of mapping them to WASD."*

---

## How `main.c` consumes this

Per game tick:
```c
while (keyPressed()) {              // drain ALL pending bytes
    int key = readKey();
    switch (key) {
        case 'w': case 'W':       p1_pending = DIR_UP;  break;
        case KEY_UP:              p2_pending = DIR_UP;  break;
        case 'q': quit_request = 1; break;
        ...
    }
}
```

The **drain-all loop** is critical: if both players type at once, both bytes are in the buffer. We process them all before moving the game forward — see [`11-main.md`](11-main.md) for the full multiplayer race-fix story.

---

## 📢 Presentation Script — "Keyboard"

> "Default terminals are line-buffered: you type a whole line, hit Enter, and only then does your program see anything. That's useless for a game. We need every key the instant it's pressed.
>
> Solution: **raw mode** via `termios`. We tell the kernel: turn off canonical mode, turn off echo. Now each keystroke comes through as a single byte. We also set `O_NONBLOCK` so `read()` never waits — if there's no input, it returns immediately and the game loop keeps running.
>
> The fun part is **arrow keys**. They're not single bytes — they arrive as a 3-byte sequence: ESC, `[`, then `A`/`B`/`C`/`D`. So our `readKey` function detects an ESC byte, reads two more, and decodes the arrow. We return constants 128–131 — **deliberately outside ASCII** — so in 2-player mode we can tell P1's `w` apart from P2's up arrow."

---

✅ Next: [`07-score.md`](07-score.md) — saving high scores without `<stdio.h>`.
