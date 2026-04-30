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

## Presentation deck (Apr 30, 2026)
- Created `/app/docs/presentation.html` — single-file 22-slide Reveal.js deck (dark terminal/hacker aesthetic, JetBrains Mono + Space Grotesk, animated gradient snake banner, code syntax highlighting via Monokai).
- Slides cover: title → challenge → architecture → Makefile → memory → math/LCG → string/int-to-str → screen/ANSI → keyboard raw-mode → score POSIX I/O → snake linked list → collision rules → visual gradient upgrade → menu → BFS intro → BFS code → main loop → multiplayer race fix → live demo cue → lessons → stats → thanks/Q&A.
- Each slide has **speaker notes** (press `S` to pop out presenter view in Reveal).
- No build step — just open the HTML in any browser (CDN-loaded deps).

## Snake visual upgrade (Apr 29, 2026)
- Replaced line/corner glyphs (`═║╔╗╚╝`) with solid `█` blocks for snake body.
- Per-segment **gradient color**: head = darkest, tail = lightest, sampled from an 8-step 256-color ramp.
- **Time-cycling hue**: active ramp rotates every ~18 ticks through greens → cyans → blues → purples → reds → oranges. Implemented via `g->color_phase` advanced each tick + `paint_snake_gradient(...)` repaint after every move.
- 2-player: P2 uses a `+3` ramp offset so the two snakes never share a hue.
- Removed now-unused helpers `head_ch`, `seg_ch`, `redraw_old_head`, `redraw_snake`, `norm_d`.
- Verified visually + via PTY harness (snake renders 32 `█` blocks + 113 distinct 256-color escapes per second of play).
- Updated `docs/08-game.md` to describe the new rendering.

## Documentation pack (Apr 29, 2026)
Created `/app/docs/` — 13 beginner-friendly .md files for someone who knows Python/JS but not C.
Each covers What → Why → How → Line-by-line walkthrough → Diagrams → 📢 Presentation script.
- README.md (index + learning path + 30-min talk outline)
- 00-c-basics.md (C survival kit: pointers, structs, headers, compilation pipeline)
- 01-makefile.md (build system, -MMD -MP header tracking)
- 02-memory.md (free-list allocator)
- 03-math.md (LCG PRNG)
- 04-string.md (int_to_str reverse-then-flip trick)
- 05-screen.md (ANSI escape codes, alt-screen, buffered output)
- 06-keyboard.md (termios raw mode, arrow-key 3-byte sequences)
- 07-score.md (POSIX open/read/write — no stdio)
- 08-game.md (linked-list snake, collision rules, render pipeline)
- 09-menu.md (reusable list selector)
- 10-ai.md (BFS pathfinding, parent-table reconstruction)
- 11-main.md (game loop, multiplayer race fix, signal handling)
~2958 lines total.
