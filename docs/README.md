# Snake Game — Complete Beginner's Guide

> **Audience:** You know **Python** or **JavaScript** but have **never written C**.
> **Goal:** By the end of these docs, you will understand **every line** of this Snake game and be able to **explain it confidently** to a class or interviewer.

---

## How to read these docs

These files are designed as a **learning path**. Read them **in order** — each file builds on the last.

| # | File | What you'll learn | Time |
|---|------|-------------------|------|
| 0 | [`00-c-basics.md`](00-c-basics.md) | C survival kit (vs Python/JS): pointers, structs, headers, compilation | 25 min |
| 1 | [`01-makefile.md`](01-makefile.md) | How `make` turns 10 `.c` files into one `./snake` binary | 10 min |
| 2 | [`02-memory.md`](02-memory.md) | A handwritten heap allocator (no `malloc`!) using a free-list | 25 min |
| 3 | [`03-math.md`](03-math.md) | Integer math helpers + a Linear Congruential PRNG | 10 min |
| 4 | [`04-string.md`](04-string.md) | Custom `strlen`, `strcpy`, `int↔string` (no `<string.h>`) | 15 min |
| 5 | [`05-screen.md`](05-screen.md) | Drawing a UI in the terminal with ANSI escape codes | 25 min |
| 6 | [`06-keyboard.md`](06-keyboard.md) | Non-blocking key reads with `termios` raw mode | 20 min |
| 7 | [`07-score.md`](07-score.md) | Saving high scores using raw POSIX `open/read/write` | 15 min |
| 8 | [`08-game.md`](08-game.md) | The big one — snake state, collisions, food, scoring | 45 min |
| 9 | [`09-menu.md`](09-menu.md) | Two-screen interactive menu | 10 min |
| 10 | [`10-ai.md`](10-ai.md) | Auto-play with **BFS pathfinding** | 25 min |
| 11 | [`11-main.md`](11-main.md) | The game loop, input routing, multiplayer race fix | 25 min |

**Total:** ~4 hours of focused study.

---

## 🎤 Ready to present?

Open **[`presentation.html`](presentation.html)** in any browser — a 22-slide self-contained deck (Reveal.js via CDN) covering the entire project with speaker notes (`S` key), code snippets, ASCII diagrams, and an animated gradient snake banner. Use ← / → to navigate, `F` for fullscreen, `S` to pop out speaker-notes view.

---

## What is this project?

A complete **terminal Snake game** written in C with **zero use of the standard library helpers** that beginners normally rely on:

- ❌ No `malloc` / `free` → we wrote our own [`memory`](02-memory.md) allocator
- ❌ No `<string.h>` → we wrote our own [`string`](04-string.md) utilities
- ❌ No `<math.h>` → we wrote our own [`math`](03-math.md) (including a PRNG)
- ❌ No `fopen` / `fprintf` for save files → we used raw POSIX [`open/read/write`](07-score.md)

It is a **"from-scratch" educational masterpiece** — every byte is accounted for.

### Features

- **3 modes** — Single Player, AI Auto-play, 2-Player Local
- **3 difficulties** — Easy / Normal / Hard (different tick speeds)
- **Persistent high scores** — one file per mode/difficulty
- **Bonus food** — random `★` worth 5 points with a lifetime timer
- **Smooth rendering** — UTF-8 box characters `╔═╗║║╚═╝` with corner-aware bends
- **AI mode** — BFS finds shortest path to food every tick
- **2-player** — P1 = WASD, P2 = arrows, with a fix for the same-millisecond keypress race

---

## Project layout

```
/app
├── Makefile                  ← Build recipe
├── snake                     ← Compiled binary (after `make`)
├── include/                  ← Header files (.h) — public API
│   ├── memory.h, math.h, string.h
│   ├── screen.h, keyboard.h
│   ├── game.h, menu.h, ai.h, score.h
└── src/                      ← Implementation (.c) — function bodies
    ├── main.c                ← Entry point + game loop
    ├── memory.c, math.c, string.c
    ├── screen.c, keyboard.c
    ├── game.c, menu.c, ai.c, score.c
```

**Naming convention:** every `something.c` has a matching `something.h`. The `.h` file declares **what** the module offers; the `.c` file says **how** it does it.

---

## How to build and run

```bash
cd /app
make clean && make      # Compiles all .c files → ./snake
./snake                 # Run it
```

**Controls:**
- **Menu:** W/S or ↑/↓ to navigate, Enter to select, Q to quit
- **Single Player / AI:** WASD or arrow keys
- **2-Player:** P1 uses WASD, P2 uses arrow keys
- **In-game:** R = restart, M = menu, Q = quit

---

## How the modules fit together

```
                    ┌─────────────┐
                    │   main.c    │  ← entry point, game loop
                    └──┬───┬───┬──┘
              ┌────────┘   │   └────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  menu.c  │ │  game.c  │ │   ai.c   │
        └──────────┘ └────┬─────┘ └─────┬────┘
                          │             │
        ┌─────────────────┼─────────────┘
        ▼                 ▼
   ┌─────────┐      ┌─────────┐
   │ score.c │      │screen.c │
   └────┬────┘      └─────────┘
        │
        ▼
   ┌──────────┬──────────┬──────────┐
   │ string.c │  math.c  │ memory.c │   ← foundations
   └──────────┴──────────┴──────────┘
        ▲
   ┌──────────┐
   │keyboard.c│   (used by main.c + menu.c)
   └──────────┘
```

The **bottom layer** (`memory`, `math`, `string`) has zero dependencies — they are the foundations. Everything else builds on top.

---

## Presenting this project

At the end of every module doc you'll find a **"📢 Presentation Script"** section — a 1–2 minute spoken walkthrough you can use directly when explaining the module to your audience.

For a full project presentation, here's a suggested **30-minute talk structure**:

1. **Hook (2 min)** — Live demo: launch the game, eat food, die, show high score persists across runs.
2. **The challenge (3 min)** — "We banned `malloc`, `printf`, `<string.h>`, `<math.h>`. Why? To prove we understand what they actually do."
3. **Foundations (8 min)** — Walk through `memory.c` (free-list), `math.c` (LCG), `string.c` (`int_to_str`).
4. **The terminal as a canvas (5 min)** — `screen.c` ANSI escape codes, `keyboard.c` raw mode.
5. **Game logic (7 min)** — Linked-list snake, collision rules, food spawn.
6. **Smart parts (4 min)** — BFS AI, multiplayer race fix.
7. **Q&A (1 min)**

Good luck — now go to [`00-c-basics.md`](00-c-basics.md). 🐍
