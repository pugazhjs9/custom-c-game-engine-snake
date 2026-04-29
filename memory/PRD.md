# c-snake-from-scratch — PRD

## Original problem statement
Add to the existing terminal Snake game (C, no stdlib helpers):
1. Persistent high-score saving via custom POSIX I/O (no `<stdio.h>`)
2. Main menu with difficulty selection (Easy / Normal / Hard)
3. AI auto-play mode using BFS pathfinder
4. 2-player local multiplayer
5. Resolve simultaneous-keypress race in multiplayer
6. Build & run to verify

## What's been implemented (Apr 29, 2026)
- **Persistent high-score** — `src/score.c` uses POSIX `open/read/write/close`. Per-mode files (`.snake_highscore_easy/normal/hard/ai/multi`). Score serialised via custom `int_to_str`/`str_to_int`. No `<stdio.h>` involved in the storage path.
- **Main menu + difficulty** — `src/menu.c` renders two navigable screens (mode → difficulty) with WASD/Arrow keys, Enter to confirm. ▶ caret indicates current selection. Per-item hint line. Clean redraw via existing `screen.c`.
- **AI auto-play (BFS)** — `src/ai.c` runs a fresh BFS from the snake head to the food every tick, treating snake bodies as obstacles, supporting wraparound walls. Reconstructs the first move by walking parent-direction pointers backward. Falls back to any safe direction if no path exists.
- **2-player local multiplayer** — Refactored `Game` to hold `Snake p1, p2`. P1 controls WASD, P2 controls arrow keys. Cross-snake collision, head-to-head clash (both die → draw), per-player score in HUD, win/lose/draw banner on game over.
- **Same-millisecond keypress fix** — `keyboard.c` now returns distinct codes for arrow keys (`KEY_UP/DOWN/LEFT/RIGHT` = 128–131) instead of mapping them to WASD. Main loop drains stdin per tick into TWO independent slots (`p1_pending`, `p2_pending`), so even if both players' bytes arrive in the same `read()` burst, both directions get applied at the next tick boundary. Within a single player, last-press still wins (existing behaviour).
- **Header dependency tracking** — Makefile now uses `-MMD -MP`, so editing a header forces all dependents to rebuild. (Found this the hard way during a stale-`.o` debugging session.)
- **Render-order fix** — `redraw_old_head` now runs *after* the new head is prepended, so the demoted previous head gets the correct corner glyph instead of a segment two-back.

## Files added
- `include/score.h`, `src/score.c`
- `include/menu.h`, `src/menu.c`
- `include/ai.h`, `src/ai.c`

## Files modified
- `include/string.h`, `src/string.c` — added `str_to_int`
- `include/keyboard.h`, `src/keyboard.c` — `readKey` now `int`, returns distinct arrow-key codes
- `include/game.h`, `src/game.c` — `Snake` struct, `GameMode`, `Difficulty`, dual-snake update/render
- `src/main.c` — menu loop, mode dispatch, AI integration, per-player input routing, score persistence
- `Makefile` — `-D_DEFAULT_SOURCE -MMD -MP`

## How to build & run
```bash
cd /app
make clean && make
./snake
```
Controls:
- Menu: W/S or Arrow Up/Down navigate; Enter or D selects; Q quits
- Single Player / AI: WASD or Arrow keys
- 2 Player: P1 = WASD, P2 = Arrow keys
- During game: R restart, M back to menu, Q quit

## Verified end-to-end (Apr 29, 2026)
- Single-player + manual moves → score / HI HUD updates, snake bends correctly
- AI mode → BFS finds food, score increments, persists to `.snake_highscore_ai`, reloads on next launch (verified HI:2 after restart)
- 2-Player mode → P1 + P2 HUD render side-by-side, simultaneous burst input `\x64\x1b[C` (P1 'd' + P2 right-arrow in the same write) accepted by both snakes without one starving the other
- Menu → Quit → exits cleanly with code 0

## Backlog / future improvements (deferred)
- Pause state (P key) — enum is already present
- Powerups (slow-mo, ghost mode)
- Network multiplayer (TCP socket between two terminals)
- Better AI: Hamiltonian-cycle "perfect" play, or look-ahead for self-trap avoidance
