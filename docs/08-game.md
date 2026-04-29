# 08 — Game: The Heart of the Snake

> **In one sentence:** This module owns the **state** of a Snake game (snakes, food, board, score) and the **rules** that move the world forward one tick at a time.

This is the biggest file in the project. We'll go top-down: data structures → lifecycle → per-tick update → rendering.

---

## Data structures

### `Direction`, `GameMode`, `Difficulty`, `GameState`

```c
typedef enum { DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT } Direction;
typedef enum { STATE_MENU, STATE_PLAYING, STATE_PAUSED, STATE_GAMEOVER } GameState;
typedef enum { MODE_SINGLE, MODE_AI, MODE_MULTI } GameMode;
typedef enum { DIFF_EASY, DIFF_NORMAL, DIFF_HARD } Difficulty;
```

`enum` is C's "named integer constants". `DIR_UP = 0, DIR_DOWN = 1, ...` automatically.

### `Segment` — one cell of a snake

```c
typedef struct Segment {
    int x;
    int y;
    struct Segment *next;
} Segment;
```

A linked-list node. The snake is a chain: head → next → next → ... → tail.

### `Snake` — one player's snake

```c
typedef struct {
    Segment   *head;        // pointer to first segment
    Segment   *tail;        // pointer to last segment (cached for O(1) tail removal)
    int        length;
    Direction  dir;          // current direction
    Direction  pending_dir;  // direction queued by the input system
    int        has_pending;
    int        score;
    int        alive;
    int        color_head;
    int        color_body;
    int        id;           // 1 or 2
} Snake;
```

The two key things to notice:
- We cache **`tail`** so we can remove the last segment in O(1) without walking the list.
- `pending_dir` + `has_pending` form a **direction buffer** so input is decoupled from the tick rate.

### `Game` — everything

```c
typedef struct {
    GameMode    mode;
    Difficulty  difficulty;
    Snake       p1;
    Snake       p2;            // unused unless MODE_MULTI
    Point       food;
    Point       bonus_food;
    int         bonus_active;
    int         bonus_timer;
    int         high_score;
    int         loaded_high_score;
    GameState   state;
    int         board_w, board_h;
    int         tick_ms;       // current speed (ms per tick)
    int         base_tick_ms;
    int         winner;        // 1, 2, or 3 (draw)
} Game;
```

A single `Game` value holds the entire game's state — pure data, no globals.

---

## Snake as a linked list — diagram

```
              ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
   head ───→  │ x=10 │ →  │ x=9  │ →  │ x=8  │ →  │ x=7  │ ──→ NULL
              │ y=5  │    │ y=5  │    │ y=5  │    │ y=5  │
              └──────┘    └──────┘    └──────┘    └──────┘
                  ▲                                    ▲
            head pointer                          tail pointer
```

**To move forward:** add a new head, optionally remove the old tail. Constant time at both ends thanks to the cached `tail` pointer.

**To grow:** add a new head, **don't** remove the tail. Length increases by 1.

---

## Direction buffer — the trick

In a tick-based game the player can press 5 keys per tick. We don't want to apply all 5 (they'd cancel each other) — we want **the latest one** to take effect at the next tick boundary.

```c
void game_set_player_dir(Game *g, int player, Direction d) {
    Snake *s = (player == 1) ? &g->p1 : &g->p2;
    if (!s->alive) return;
    if (s->length > 1 && is_opposite(s->dir, d)) return;   // prevent 180° suicide
    s->pending_dir = d;
    s->has_pending = 1;
}
```

Three guards:
1. Dead snake ignores input.
2. Can't reverse into your own neck.
3. The latest call wins (just overwrites `pending_dir`).

Then at update time:
```c
Direction d = s->has_pending ? s->pending_dir : s->dir;
```

---

## Lifecycle: `game_init`

```c
void game_init(Game *g) {
    int tc, tr;
    screen_get_terminal_size(&tc, &tr);
    g->board_w = math_clamp(tc, MIN_BOARD_W, 200);
    g->board_h = math_clamp(tr - 3, MIN_BOARD_H, 60);   // -3 leaves room for HUD

    g->base_tick_ms = difficulty_tick_ms(g->difficulty);
    g->tick_ms      = g->base_tick_ms;
    g->state        = STATE_PLAYING;
    g->bonus_active = 0;
    g->winner       = 0;

    if (g->mode == MODE_MULTI) {
        int cy  = math_div(g->board_h, 2);
        int cxl = math_div(g->board_w, 4);          // 1/4 from the left
        int cxr = g->board_w - cxl;                 // 1/4 from the right
        snake_init(&g->p1, 1, cxl, cy, DIR_RIGHT, CLR_P1_HEAD, CLR_P1_BODY, 4);
        snake_init(&g->p2, 2, cxr, cy, DIR_LEFT,  CLR_P2_HEAD, CLR_P2_BODY, 4);
    } else {
        int cx = math_div(g->board_w, 2);
        int cy = math_div(g->board_h, 2);
        snake_init(&g->p1, 1, cx, cy, DIR_RIGHT, CLR_P1_HEAD, CLR_P1_BODY, 4);
    }

    game_spawn_food(g);
    game_full_redraw(g);
}
```

In multi mode, snakes start at 1/4 and 3/4 of the width, facing each other. `snake_init` allocates 4 segments via `mem_alloc`, chained into a list.

### Difficulty → tick speed

```c
static int difficulty_tick_ms(Difficulty d) {
    if (d == DIFF_EASY)   return 280;     // slow
    if (d == DIFF_NORMAL) return 200;
    return 130;                            // hard, fast
}
```

Smaller `tick_ms` = faster snake.

---

## The big function: `game_update`

Called once per tick. It advances the world by exactly one cell.

### Step 1 — compute candidate next-head positions

```c
new_d1 = compute_next_head(&g->p1, g, &np1);
if (g->mode == MODE_MULTI)
    new_d2 = compute_next_head(&g->p2, g, &np2);
```

`compute_next_head` reads the current head, applies `pending_dir`, computes the next cell with **wraparound** at the borders:

```c
switch (d) {
    case DIR_UP:    ny--; break;
    ...
}
if (nx <= 0)              nx = g->board_w - 2;   // wrap at left edge
if (nx >= g->board_w - 1) nx = 1;                // wrap at right edge
... same for y ...
```

### Step 2 — did anyone eat food?

```c
ate_food_p1  = (np1.x == g->food.x && np1.y == g->food.y);
ate_bonus_p1 = (g->bonus_active && np1.x == g->bonus_food.x ...);
```

We decide this **before** collision detection because eating affects whether the tail moves (eaten → snake grows → tail stays put).

### Step 3 — collision detection

For each snake, we check the candidate new head against:
1. Its **own body**, excluding its own tail (the tail will move out of the way unless we're growing).
2. The **other snake's body** (in multi mode), with the same tail-exclusion rule for the other.
3. **Head-to-head** with the other snake (same destination cell).

```c
c = g->p1.head;
while (c) {
    if (c == g->p1.tail && !p1_grew) { c = c->next; continue; }   // skip tail
    if (c->x == np1.x && c->y == np1.y) { p1_self = 1; break; }
    c = c->next;
}
```

If P1 dies in single-player → `STATE_GAMEOVER`, play death animation, return.
In multi-player → if both die same tick → draw; else the survivor wins.

### Step 4 — apply moves

```c
apply_move(&g->p1, np1, p1_grew, &erased_x, &erased_y);
```

`apply_move`:
1. Allocate a new `Segment` for the new head via `mem_alloc(sizeof(Segment))`.
2. Set its `next` to the old head (it becomes the new head).
3. **If grew** → length++ and stop.
4. **Else** → walk to the segment whose `next` is `tail`, free the tail, update the tail pointer.

### Step 5 — handle eating

```c
if (ate_food_p1) {
    g->p1.score += 1;
    g->tick_ms = math_max(g->tick_ms - SPEED_DECREASE, MIN_TICK_MS);  // speed up!
} else if (ate_bonus_p1) {
    g->p1.score += 5;
    g->tick_ms = math_max(g->tick_ms - SPEED_DECREASE * 2, MIN_TICK_MS);
}
```

The snake **gets faster** every food eaten, capped at `MIN_TICK_MS = 40` ms.

### Step 6 — bonus food lifecycle

```c
if (g->bonus_active) {
    g->bonus_timer--;
    if (g->bonus_timer <= 0) game_erase_bonus(g);
} else if (... && math_rand(1, 100) <= BONUS_CHANCE) {
    game_spawn_bonus(g);                          // 2% chance per tick
}
```

A `★` appears randomly, lives for 50 ticks, gives 5 points.

---

## Rendering tricks

### Snake bend characters

The body uses different glyphs depending on which way it bends:

```
═     horizontal segment        ║     vertical segment
╔     turn from right to down    ╗    turn from left to down
╚     turn from right to up      ╝    turn from left to up
```

`seg_ch(prev, curr, next)` figures out which one to draw based on the direction from prev→curr→next:

```c
if (d1y==0 && d2y==0) return CH_H;   // both moves horizontal → ═
if (d1x==0 && d2x==0) return CH_V;   // both moves vertical   → ║
... else compute which corner glyph by checking left/right/up/down direction
```

### Render-order fix (from PRD)

When the snake moves, the **previous head cell** must change from "head arrow" (`▲`/`▶`) to a body segment glyph (`═`/`╗`/etc.). Originally this was drawn **before** the new head was prepended → we'd render the wrong segment as a corner. The fix:

> *"`redraw_old_head` now runs after the new head is prepended, so the demoted previous head gets the correct corner glyph instead of a segment two-back."*

### Death animation

`death_animate_snake` does a 3-blink red-flash, then dissolves the snake from tail-to-head with `•` dots, then erases. Pure terminal art, all timing via `usleep`.

---

## Public API summary

```c
void game_init(Game *g);
void game_cleanup(Game *g);                   // mem_free all segments
void game_set_player_dir(Game *g, int player, Direction d);
void game_update(Game *g);                    // advance 1 tick
void game_render(const Game *g);              // HUD + game-over banner
void game_full_redraw(Game *g);               // for resize / fresh start
int  game_is_running(const Game *g);
void game_spawn_food(Game *g);
const char *game_score_tag(const Game *g);    // for save file naming
int  game_cell_blocked(const Game *g, ...);   // used by the AI
void game_wrap_coords(const Game *g, int *x, int *y);
```

---

## Worked example — a single tick

```
State before tick:
    P1 head at (5, 5), facing RIGHT, length 4, pending = RIGHT
    Food at (6, 5)

Tick begins:
    compute_next_head → np1 = (6, 5)
    ate_food_p1 = TRUE        (np1 == food)
    p1_grew = TRUE
    Collision check: (6,5) is empty → safe
    apply_move:
       new Segment(6,5) prepended → head is now (6,5)
       p1_grew → don't remove tail
       length now 5
    Score++
    tick_ms decreases by 4
    Spawn new food somewhere random.
```

---

## 📢 Presentation Script — "Game logic"

> "This is the heart of the project. The game state is one big struct: two snakes, food positions, board size, tick speed, score. Each snake is a **linked list of segments** — head → ... → tail. We keep a tail pointer cached so removing the tail is O(1).
>
> Each tick of the game loop calls `game_update`, which does five things in order:
>
> 1. Compute where each snake's head **would** go.
> 2. Check if it lands on food or bonus.
> 3. **Collision detection** — own body, other snake's body, head-to-head.
> 4. If anyone died, end the game and play the death animation.
> 5. Otherwise, apply the moves: prepend a new segment, free the old tail (unless the snake grew). Update score, maybe spawn a bonus.
>
> Direction input is decoupled from the tick: the keyboard sets a `pending_dir` and the next tick honors it. That means smooth controls even if the player presses 5 keys in one tick — only the latest matters.
>
> Two cool details: the snake body uses different Unicode glyphs depending on whether it's straight or bending — `═`, `║`, `╔`, `╗`, `╚`, `╝`. And the food position is chosen via our LCG random in [`math.c`](03-math.md), retrying if it lands on a snake cell."

---

✅ Next: [`09-menu.md`](09-menu.md) — the menu system.
