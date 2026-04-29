# 11 — Main: Entry Point and Game Loop

> **In one sentence:** `main.c` boots all subsystems, runs the menu, runs the game loop (input → update → render → sleep), and tears everything down on exit.

This is the file that ties the project together. Everything else is a module that **`main.c` orchestrates**.

---

## The 3-second mental model

```
main()
  ├─ initialize subsystems
  └─ outer loop:
       ├─ menu_run()                ← user picks mode + difficulty
       ├─ game_init()                ← create snakes, food, etc.
       └─ run_game_session() loop:
            ├─ drain input bytes
            ├─ if AI mode: ai_decide()
            ├─ apply pending directions
            ├─ game_update()         ← advance one tick
            ├─ game_render()
            └─ sleep until next tick
```

That's the whole program.

---

## Boot sequence: `main()`

```c
int main(void) {
    int tc, tr;

    mem_init();                                              // ① memory pool
    math_seed((unsigned int)time((time_t *)0));              // ② PRNG seeded
    screen_get_terminal_size(&tc, &tr);
    screen_init(tc, tr);                                     // ③ alt screen, raw buf
    kb_init();                                               // ④ raw keyboard
    signal(SIGWINCH, handle_sigwinch);                       // ⑤ window-resize hook

    while (1) {
        Game game;
        MenuResult mr;

        screen_get_terminal_size(&tc, &tr);
        int board_w = math_clamp(tc, 25, 200);
        int board_h = math_clamp(tr - 3, 12, 60);

        mr = menu_run(board_w, board_h);                     // ⑥ menu
        if (mr.quit) break;

        // Zero-init game struct
        char *p = (char *)&game;
        for (int i = 0; i < (int)sizeof(Game); i++) p[i] = 0;
        game.mode = mr.mode;
        game.difficulty = mr.difficulty;
        game_init(&game);                                    // ⑦ build snakes + food

        int rc = 1;
        while (rc == 1 || rc == 2) {
            if (rc == 2) {                                   // restart in same mode
                game_cleanup(&game);
                p = (char *)&game;
                for (int i = 0; i < (int)sizeof(Game); i++) p[i] = 0;
                game.mode = mr.mode;
                game.difficulty = mr.difficulty;
                game_init(&game);
            }
            rc = run_game_session(&game);                    // ⑧ play one game
            if (rc == 1) { game_cleanup(&game); break; }     // → back to menu
            if (rc == 0) { game_cleanup(&game); goto quit; } // → quit
            // rc == 2 → restart
        }
    }

quit:
    kb_cleanup();
    screen_cleanup();
    return 0;
}
```

### What ① through ⑤ do

| Step | Why |
|---|---|
| ① `mem_init()` | Set up the 64 KB memory pool. **Must** be first — `game_init` calls `mem_alloc`. |
| ② `math_seed(time(0))` | Different food positions every run. |
| ③ `screen_init` | Switch to alternate screen, hide cursor, enable big output buffer. |
| ④ `kb_init` | Raw mode + non-blocking stdin. |
| ⑤ `signal(SIGWINCH, ...)` | Register a hook for **window resize** events — sets `resize_flag`. |

### Window resize handling

When you drag the terminal corner, the kernel sends `SIGWINCH` to the process:

```c
static volatile int resize_flag = 0;

static void handle_sigwinch(int sig) { (void)sig; resize_flag = 1; }
```

`volatile` tells the compiler **don't optimize this variable away** — it can change asynchronously. The signal handler does the **bare minimum** (set a flag); actual work happens later in the main loop:

```c
if (resize_flag) {
    resize_flag = 0;
    clamp_after_resize(game);
    game_full_redraw(game);
}
```

`clamp_after_resize` clamps every snake segment and the food into the new bounds.

---

## The game loop: `run_game_session`

This is the **per-game heartbeat**. Returns `0` (quit), `1` (back to menu), or `2` (restart).

### Skeleton

```c
while (1) {
    if (resize_flag) { ... }

    // 1. drain input
    p1_pending = -1; p2_pending = -1;
    while (keyPressed()) {
        int key = readKey();
        // route 'q', 'r', 'm', WASD, arrows...
    }

    if (quit_request) return 0;
    if (game_over) { handle restart/menu/sleep; continue; }

    // 2. AI decision
    if (mode == MODE_AI) p1_pending = ai_decide(game);

    // 3. apply pending dirs
    if (p1_pending >= 0) game_set_player_dir(game, 1, p1_pending);
    if (p2_pending >= 0) game_set_player_dir(game, 2, p2_pending);

    // 4. update + render
    if (state == STATE_PLAYING) game_update(game);
    game_render(game);

    if (state == STATE_GAMEOVER) persist_highscore(game);

    // 5. sleep until next tick (interruptible)
    int delay = (vertical movement) ? 2 * tick_ms : tick_ms;
    int elapsed = 0;
    while (elapsed < delay) {
        usleep(10000);
        elapsed += 10;
        if (keyPressed() || resize_flag) break;
    }
}
```

### The vertical-delay trick

```c
if (game->p1.dir == DIR_UP || game->p1.dir == DIR_DOWN)
    current_delay = math_mul(game->tick_ms, 2);
else
    current_delay = game->tick_ms;
```

Terminal cells are **roughly 2x taller than they are wide**. If the snake moves vertically at the same tick rate as horizontally, it appears to **fly** vertically. So we double the delay when moving up/down to make perceived speed equal.

### The interruptible sleep

```c
while (elapsed < current_delay) {
    usleep(sleep_chunk);          // sleep 10 ms
    elapsed += 10;
    if (keyPressed()) break;       // input arrived → bail early
    if (resize_flag) break;        // resize → bail early
}
```

Instead of one big `usleep(200000)` (200 ms), we sleep in **10 ms chunks** so we can react to keys and resizes immediately. Trades a tiny CPU overhead for snappy controls.

---

## The multiplayer race fix (the famous one)

### The problem

Both players type at almost the same instant. Their bytes both end up in the stdin buffer. If the input loop only reads **one byte per tick**, one player gets ignored — they "starve".

### The fix — drain ALL bytes per tick

```c
p1_pending = -1; p2_pending = -1;        // separate slots per player
while (keyPressed()) {
    int key = readKey();
    if (game->mode == MODE_MULTI) {
        switch (key) {
            case 'w': case 'W': p1_pending = DIR_UP;   break;
            case 's': case 'S': p1_pending = DIR_DOWN; break;
            case 'a': case 'A': p1_pending = DIR_LEFT; break;
            case 'd': case 'D': p1_pending = DIR_RIGHT;break;
            case KEY_UP:    p2_pending = DIR_UP;    break;
            case KEY_DOWN:  p2_pending = DIR_DOWN;  break;
            case KEY_LEFT:  p2_pending = DIR_LEFT;  break;
            case KEY_RIGHT: p2_pending = DIR_RIGHT; break;
        }
    }
}
// both pending dirs are applied at update time, atomically
```

Each player has their **own slot**. If P1 presses `d` and P2 presses right-arrow in the same millisecond, both bytes are drained, both slots are set, and both directions take effect at the next tick. **Within** a single player, the most recent press wins (overwrite).

### Diagram

```
stdin buffer arrival:    'd'  ESC  '['  'C'   ←  P1 'd' + P2 right-arrow

drain loop:
  iter 1: keyPressed→1, readKey→'d',  p1_pending = DIR_RIGHT
  iter 2: keyPressed→1, readKey→ESC+[+C → KEY_RIGHT, p2_pending = DIR_RIGHT
  iter 3: keyPressed→0, exit loop

apply:
  game_set_player_dir(g, 1, DIR_RIGHT)  ← P1 set
  game_set_player_dir(g, 2, DIR_RIGHT)  ← P2 set, BOTH GET MOVED THIS TICK
```

This is the heart of the fix mentioned in the PRD:
> *"Same-millisecond keypress fix — Main loop drains stdin per tick into TWO independent slots so neither player starves the other."*

---

## High-score persistence

```c
static void persist_highscore(Game *g) {
    int s = g->p1.score;
    if (g->mode == MODE_MULTI && g->p2.score > s) s = g->p2.score;
    if (s > g->loaded_high_score) {
        g->loaded_high_score = s;
        score_save(game_score_tag(g), s);
    }
}
```

Take the max of P1's and P2's scores. If it beats the value loaded at session start, write it to disk via [`score_save`](07-score.md). Called on game over and on quit.

---

## Why the manual zero-init?

```c
char *p = (char *)&game;
for (int i = 0; i < (int)sizeof(Game); i++) p[i] = 0;
```

Instead of `memset` (which would require `<string.h>`), we hand-zero the entire `Game` struct. The cast `(char *)&game` lets us treat the struct as a flat byte array. Set every byte to 0 → all ints, pointers, enums start at zero. **Same effect as `memset` in 2 lines.**

---

## Cleanup on exit

```c
quit:
    kb_cleanup();         // restore termios
    screen_cleanup();     // exit alt screen, show cursor
    return 0;
```

If we skipped this, the user's terminal would be:
- In raw mode (no echo, no line buffering)
- On the alternate screen
- With a hidden cursor

They'd have to type `reset<Enter>` blindly to get sane state back. Always pair init/cleanup.

---

## 📢 Presentation Script — "Main loop"

> "`main.c` is the conductor. Boot sequence: `mem_init` for our memory pool, `math_seed` with the current time for randomness, `screen_init` to enter alt-screen mode, `kb_init` to switch the terminal into raw non-blocking mode, and a SIGWINCH handler so we redraw on resize.
>
> Then the loop: show the menu, build the game struct, and run the game loop until quit, restart, or menu.
>
> Inside the per-tick loop we do five things — drain input, optionally call the AI for P1, apply pending directions, call `game_update`, render, and sleep until the next tick. The sleep is broken into 10 ms chunks so we can react instantly to keys.
>
> The most subtle bit is the **multiplayer fairness fix**. When both players press a key in the same millisecond, both bytes are in stdin together. We drain **every** byte each tick and route each into a per-player slot — P1 to `p1_pending`, P2 to `p2_pending`. Both slots get applied atomically at update time. Without this, one player would consistently starve. With it, the input feels perfectly fair.
>
> One more nice detail: vertical moves wait twice as long as horizontal, because terminal cells are taller than they are wide — equalizes perceived speed."

---

🎉 **You've reached the end of the docs.**

If you've read all 11 files, you understand:
- Every line of every `.c` file in the project.
- Every system-level concept it touches (memory, syscalls, signals, termios, ANSI codes, BFS).
- How to **explain** any of it to a class with the presentation scripts.

Go play the game. `make && ./snake`. 🐍
