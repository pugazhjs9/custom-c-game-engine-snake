# 05 — Screen: Drawing in the Terminal

> **In one sentence:** The terminal is a grid of cells; we move the cursor and print characters using **ANSI escape codes** — magic strings that the terminal interprets as commands instead of text.

---

## What is an "ANSI escape code"?

Your terminal (xterm, iTerm, GNOME Terminal, Windows Terminal) understands special byte sequences that **don't print as text** — they tell the terminal to do something:

- Move the cursor to row 5, column 10
- Clear the screen
- Change foreground color to red
- Hide the cursor

Every code starts with the **ESC** character (byte `0x1B`, written `\x1b` in C), usually followed by `[`. Together that's called the **CSI** (Control Sequence Introducer):

```c
#define ESC "\x1b"
#define CSI ESC "["       // → "\x1b["
```

### Examples

| Code | What it does |
|---|---|
| `\x1b[2J` | Clear the entire screen |
| `\x1b[H` | Move cursor to top-left (row 1, col 1) |
| `\x1b[5;10H` | Move cursor to row 5, col 10 |
| `\x1b[31m` | Set text color to red |
| `\x1b[0m` | Reset all colors to default |
| `\x1b[?25l` | Hide cursor |
| `\x1b[?25h` | Show cursor |
| `\x1b[?1049h` | Switch to **alternate screen** (so we don't trash the user's shell) |

We just `printf` these strings and the terminal handles them. Real-time graphics with no external library!

---

## The two big ideas

### 1. Alternate screen buffer

Most terminals support two screens: a **main** one (your normal shell) and an **alternate** one for full-screen apps like `vim`, `htop`, and **us**. When the game ends we restore the main screen — your shell history is exactly as you left it.

```c
printf(CSI "?1049h");   // enter alt screen
... play the game ...
printf(CSI "?1049l");   // leave alt screen → user's terminal is pristine
```

### 2. Buffered output

If we `printf` 100 times to draw one frame, the terminal might display partial frames → flicker. Solution: tell `stdout` to use a 64 KB buffer. All `printf` calls accumulate, then we call `fflush(stdout)` once per frame to atomically flush everything.

```c
setvbuf(stdout, NULL, _IOFBF, 65536);   // 64 KB full-buffered
... lots of printf ...
fflush(stdout);                          // commit the whole frame
```

This is **the** technique for flicker-free terminal animation.

---

## Public API (from `screen.h`)

```c
void screen_init(int w, int h);            // setup
void screen_cleanup(void);                 // teardown
void screen_clear(void);
void screen_move_cursor(int x, int y);
void screen_put_char(int x, int y, char c);
void screen_put_utf8(int x, int y, const char *s);
void screen_put_str(int x, int y, const char *s);
void screen_set_color_256(int fg, int bg);
void screen_reset_color(void);
void screen_draw_border(int w, int h);
void screen_flush(void);
void screen_get_terminal_size(int *cols, int *rows);
```

---

## Code walkthrough

### `screen_init` — set up everything

```c
void screen_init(int width, int height) {
    setvbuf(stdout, (char *)0, _IOFBF, 65536);   // big buffer
    printf(CSI "?1049h");   // alternate screen
    printf(CSI "?25l");     // hide cursor
    printf(CSI "2J");       // clear all
    printf(CSI "H");        // home cursor
    fflush(stdout);
}
```

Four magic strings, and we have a clean canvas to draw on.

### `screen_get_terminal_size` — ask the kernel

```c
void screen_get_terminal_size(int *cols, int *rows) {
    struct winsize ws;
    if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws) == 0) {
        *cols = ws.ws_col;
        *rows = ws.ws_row;
    } else {
        *cols = 80; *rows = 24;        // safe defaults
    }
}
```

`ioctl` (I/O control) with `TIOCGWINSZ` (Terminal IOCTL Get WINdow SiZe) — the kernel fills in the struct. If it fails (e.g., piped output), default to 80x24 — the classic VT100 size.

### `screen_move_cursor` — coordinates

```c
void screen_move_cursor(int x, int y) {
    printf(CSI "%d;%dH", y + 1, x + 1);
}
```

Note: the terminal's coordinate system is **1-based** (`row 1, col 1` = top-left), and the order is **row first, then column**. Our function is **0-based** like programmers expect, and `(x, y)` order. We convert.

### Drawing primitives

```c
void screen_put_char(int x, int y, char c) {
    screen_move_cursor(x, y);
    putchar(c);
}

void screen_put_utf8(int x, int y, const char *s) {
    screen_move_cursor(x, y);
    if (s) printf("%s", s);
}
```

Both: move cursor, then print. UTF-8 strings are multi-byte characters like `"\xe2\x95\x97"` (the box-drawing `╗`).

### Colors — the 256-color palette

```c
void screen_set_color_256(int fg, int bg) {
    if (fg >= 0) printf(CSI "38;5;%dm", fg);
    if (bg >= 0) printf(CSI "48;5;%dm", bg);
}
```

The terminal has a **256-color palette** (separate from RGB). `38;5;N` sets foreground to color N; `48;5;N` sets background. We pass `-1` to skip a side. The game uses this for the snake colors:

```c
#define CLR_P1_HEAD    46    // bright green
#define CLR_P1_BODY    34    // green
#define CLR_FOOD      196    // bright red
#define CLR_BORDER    220    // gold
```

A handy palette: <https://www.ditig.com/256-colors-cheat-sheet>

### `screen_draw_border` — the box around the play area

```c
void screen_draw_border(int w, int h) {
    int i;

    // Top border:  ╔════╗
    screen_move_cursor(0, 0);
    printf("\xe2\x95\x94");                              // ╔
    for (i = 1; i < w - 1; i++) printf("\xe2\x95\x90");  // ═
    printf("\xe2\x95\x97");                              // ╗

    // Bottom border:  ╚════╝
    screen_move_cursor(0, h - 1);
    printf("\xe2\x95\x9a");                              // ╚
    for (i = 1; i < w - 1; i++) printf("\xe2\x95\x90");  // ═
    printf("\xe2\x95\x9d");                              // ╝

    // Side borders:  ║    ║
    for (i = 1; i < h - 1; i++) {
        screen_move_cursor(0, i);     printf("\xe2\x95\x91");   // ║
        screen_move_cursor(w - 1, i); printf("\xe2\x95\x91");   // ║
    }
}
```

Those `"\xe2\x95\x..."` strings are the **UTF-8 byte sequences** for Unicode box-drawing characters: ╔ ═ ╗ ╚ ╝ ║. Each character takes 3 bytes in UTF-8. We don't need to know what they are at the C level — we just print the bytes and the terminal renders them.

### Diagram of the drawn screen

```
col→  0    5    10   15   20
row
0    ╔════════════════════╗   ← top border
1    ║                    ║
2    ║      ▶○            ║   ← snake & food
3    ║                    ║
4    ║                    ║
5    ╚════════════════════╝   ← bottom border
6    SCORE: 3   HI: 7    ← HUD line
7    WASD: Move  Q: Quit
```

### `screen_clear` — partial vs full

```c
void screen_clear(void) {
    int cols, rows, i;
    screen_get_terminal_size(&cols, &rows);
    for (i = 0; i < rows; i++) {
        screen_move_cursor(0, i);
        printf(CSI "2K");        // erase entire line
    }
    printf(CSI "H");
}
```

We loop and erase line-by-line instead of one big `\x1b[2J` because some terminals (notably macOS Terminal.app) flicker badly with the full-clear sequence.

### `screen_cleanup` — leave gracefully

```c
void screen_cleanup(void) {
    printf(CSI "?25h");     // show cursor
    printf(CSI "?1049l");   // back to main screen
    screen_reset_color();
    fflush(stdout);
}
```

Mandatory! If the program crashes without this, the user's terminal is left with a hidden cursor and the alternate screen — they'd have to type `reset` to fix it.

---

## How `game.c` uses this module

```c
screen_set_color_256(CLR_P1_HEAD, -1);   // green text
screen_put_utf8(np1.x, np1.y, head_ch(g->p1.dir));  // draw "▲" / "▶" etc.
screen_reset_color();
```

Every snake segment, food pellet, and HUD label is one of these three steps:
1. Set color
2. Move + print at (x, y)
3. Reset color

Then once per tick: `screen_flush()`.

---

## 📢 Presentation Script — "Screen"

> "How do you draw graphics in a terminal? With magic strings called **ANSI escape codes**. Every one starts with the byte `\x1b` followed by `[`, and the terminal interprets them as commands instead of printing them.
>
> Want to move the cursor to row 5, column 10? Print `\x1b[5;10H`. Want red text? Print `\x1b[31m`. Want to clear the screen? `\x1b[2J`. That's all 'graphics' is here.
>
> Two clever tricks make it smooth. First, we switch to the **alternate screen buffer** with `\x1b[?1049h` — that's why your shell history isn't trashed when the game ends. Second, we use a 64 KB output buffer and only flush once per frame, so the terminal never sees half-drawn frames. That's flicker-free animation in 130 lines of code."

---

✅ Next: [`06-keyboard.md`](06-keyboard.md) — non-blocking input.
