#include "../include/game.h"
#include "../include/memory.h"
#include "../include/string.h"
#include "../include/math.h"
#include "../include/screen.h"
#include <stdio.h>
#include <sys/ioctl.h>
#include <unistd.h>

/* ── UTF-8 glyphs ── */
#define CH_H  "\xe2\x95\x90"  /* ═ */
#define CH_V  "\xe2\x95\x91"  /* ║ */
#define CH_TL "\xe2\x95\x94"  /* ╔ */
#define CH_TR "\xe2\x95\x97"  /* ╗ */
#define CH_BL "\xe2\x95\x9a"  /* ╚ */
#define CH_BR "\xe2\x95\x9d"  /* ╝ */
#define CH_AR "\xe2\x96\xb6"  /* ▶ */
#define CH_AL "\xe2\x97\x80"  /* ◀ */
#define CH_AU "\xe2\x96\xb2"  /* ▲ */
#define CH_AD "\xe2\x96\xbc"  /* ▼ */
#define CH_FOOD  "\xe2\x97\x8f"  /* ● */
#define CH_BONUS "\xe2\x98\x85"  /* ★ */
#define CH_DOT   "\xe2\x80\xa2"  /* • */

/* ── Colors (256-color palette) ── */
#define CLR_BORDER    220
#define CLR_P1_HEAD    46
#define CLR_P1_BODY    34
#define CLR_P2_HEAD    51
#define CLR_P2_BODY    33
#define CLR_FOOD      196
#define CLR_BONUS     226
#define CLR_TITLE      39
#define CLR_SCORE_L   252
#define CLR_SCORE_V   214
#define CLR_SPEED_L   245
#define CLR_HIGH      226
#define CLR_DEATH     196

#define MIN_BOARD_W      25
#define MIN_BOARD_H      12
#define BONUS_CHANCE      2
#define BONUS_LIFETIME   50
#define MIN_TICK_MS      40
#define SPEED_DECREASE    4

/* Difficulty → starting tick_ms */
static int difficulty_tick_ms(Difficulty d) {
    if (d == DIFF_EASY)   return 280;
    if (d == DIFF_NORMAL) return 200;
    return 130; /* HARD */
}

/* ── Direction normalisation ── */
static int norm_d(int d) { if (d > 1) return -1; if (d < -1) return 1; return d; }

static const char *head_ch(Direction d) {
    if (d == DIR_UP)   return CH_AU;
    if (d == DIR_DOWN) return CH_AD;
    if (d == DIR_LEFT) return CH_AL;
    return CH_AR;
}

static const char *seg_ch(int px,int py,int cx,int cy,int nx,int ny) {
    int d1x=norm_d(cx-px),d1y=norm_d(cy-py),d2x=norm_d(nx-cx),d2y=norm_d(ny-cy);
    int L,R,U,D;
    if(d1y==0&&d2y==0) return CH_H;
    if(d1x==0&&d2x==0) return CH_V;
    L=(d1x>0)||(d2x<0); R=(d1x<0)||(d2x>0);
    U=(d1y>0)||(d2y<0); D=(d1y<0)||(d2y>0);
    if(R&&D) return CH_TL;
    if(L&&D) return CH_TR;
    if(R&&U) return CH_BL;
    if(L&&U) return CH_BR;
    return CH_H;
}

/* ── Snake helpers ── */
static int snake_contains(const Snake *s, int x, int y) {
    Segment *c;
    if (!s || !s->head) return 0;
    c = s->head;
    while (c) { if (c->x == x && c->y == y) return 1; c = c->next; }
    return 0;
}

static int is_opposite(Direction a, Direction b) {
    if (a == DIR_UP && b == DIR_DOWN) return 1;
    if (a == DIR_DOWN && b == DIR_UP) return 1;
    if (a == DIR_LEFT && b == DIR_RIGHT) return 1;
    if (a == DIR_RIGHT && b == DIR_LEFT) return 1;
    return 0;
}

static const char *mode_tag(GameMode m, Difficulty d) {
    if (m == MODE_AI)    return "ai";
    if (m == MODE_MULTI) return "multi";
    if (d == DIFF_EASY)   return "easy";
    if (d == DIFF_NORMAL) return "normal";
    return "hard";
}

void game_wrap_coords(const Game *g, int *x, int *y) {
    if (*x <= 0)              *x = g->board_w - 2;
    if (*x >= g->board_w - 1) *x = 1;
    if (*y <= 0)              *y = g->board_h - 2;
    if (*y >= g->board_h - 1) *y = 1;
}

int game_cell_blocked(const Game *g, int x, int y, int ignore_p1_tail, int ignore_p2_tail) {
    Segment *c;
    if (!g) return 0;
    c = g->p1.head;
    while (c) {
        if (ignore_p1_tail && c == g->p1.tail) { c = c->next; continue; }
        if (c->x == x && c->y == y) return 1;
        c = c->next;
    }
    if (g->mode == MODE_MULTI) {
        c = g->p2.head;
        while (c) {
            if (ignore_p2_tail && c == g->p2.tail) { c = c->next; continue; }
            if (c->x == x && c->y == y) return 1;
            c = c->next;
        }
    }
    return 0;
}

/* ── HUD ── */
static void draw_hud(const Game *g) {
    char buf[32];
    int hy, spd;
    if (!g) return;
    hy = g->board_h;
    screen_erase_line(hy);
    screen_erase_line(hy + 1);

    if (g->mode == MODE_MULTI) {
        /* P1 score on the left, P2 score on the right */
        screen_set_color_256(CLR_P1_HEAD, -1); screen_put_str(2, hy, "P1:");
        int_to_str(g->p1.score, buf, 32);
        screen_set_color_256(CLR_SCORE_V, -1); screen_put_str(6, hy, buf);

        screen_set_color_256(CLR_SPEED_L, -1);
        screen_put_str(math_div(g->board_w, 2) - 4, hy, "HI:");
        int_to_str(g->high_score, buf, 32);
        screen_set_color_256(CLR_HIGH, -1);
        screen_put_str(math_div(g->board_w, 2), hy, buf);

        screen_set_color_256(CLR_P2_HEAD, -1); screen_put_str(g->board_w - 12, hy, "P2:");
        int_to_str(g->p2.score, buf, 32);
        screen_set_color_256(CLR_SCORE_V, -1); screen_put_str(g->board_w - 8, hy, buf);

        screen_set_color_256(CLR_SPEED_L, -1);
        screen_put_str(2, hy + 1, "P1: WASD     P2: Arrows     Q:Quit  R:Restart  M:Menu");
    } else {
        const char *label = (g->mode == MODE_AI) ? "AI:" : "SCORE:";
        int label_w = (g->mode == MODE_AI) ? 4 : 7;
        screen_set_color_256(CLR_SCORE_L, -1); screen_put_str(2, hy, label);
        int_to_str(g->p1.score, buf, 32);
        screen_set_color_256(CLR_SCORE_V, -1); screen_put_str(2 + label_w, hy, buf);

        screen_set_color_256(CLR_SPEED_L, -1);
        screen_put_str(math_div(g->board_w, 2) - 3, hy, "HI:");
        int_to_str(g->high_score, buf, 32);
        screen_set_color_256(CLR_HIGH, -1);
        screen_put_str(math_div(g->board_w, 2) + 1, hy, buf);

        screen_set_color_256(CLR_SPEED_L, -1);
        screen_put_str(g->board_w - 12, hy, "SPEED:");
        spd = math_div(difficulty_tick_ms(g->difficulty) - g->tick_ms, SPEED_DECREASE) + 1;
        if (spd < 1) spd = 1;
        int_to_str(spd, buf, 32);
        screen_set_color_256(CLR_SCORE_V, -1); screen_put_str(g->board_w - 5, hy, buf);

        if (g->mode == MODE_AI) {
            screen_set_color_256(CLR_SPEED_L, -1);
            screen_put_str(2, hy + 1, "AI auto-play (BFS)    Q:Quit  R:Restart  M:Menu");
        } else {
            screen_set_color_256(CLR_SPEED_L, -1);
            screen_put_str(2, hy + 1, "WASD/Arrows:Move   Q:Quit  R:Restart  M:Menu");
        }
    }
    screen_reset_color();
}

static void draw_title(const Game *g) {
    const char *title = " S N A K E ";
    if (g->mode == MODE_AI)    title = " S N A K E   ·   A I ";
    if (g->mode == MODE_MULTI) title = " S N A K E   ·   2 P ";

    int tx = math_div(g->board_w, 2) - math_div(str_len(title), 2);
    if (tx < 1) tx = 1;
    screen_set_color_256(CLR_TITLE, -1);
    screen_put_str(tx, 0, title);
    screen_reset_color();
}

/* ── Death animation ── */
static void death_animate_snake(Snake *s) {
    Segment *curr;
    int i, count, idx;
    int px[600], py[600];
    if (!s || !s->head) return;
    count = 0; curr = s->head;
    while (curr && count < 600) { px[count] = curr->x; py[count] = curr->y; count++; curr = curr->next; }

    for (i = 0; i < 3; i++) {
        for (idx = 0; idx < count; idx++) { screen_set_color_256(CLR_DEATH, -1); screen_put_utf8(px[idx], py[idx], CH_H); }
        screen_reset_color(); screen_flush(); usleep(120000);
        for (idx = 0; idx < count; idx++) { screen_set_color_256(s->color_body, -1); screen_put_utf8(px[idx], py[idx], CH_H); }
        screen_reset_color(); screen_flush(); usleep(120000);
    }
    for (idx = 0; idx < count; idx++) { screen_set_color_256(CLR_DEATH, -1); screen_put_utf8(px[idx], py[idx], CH_H); }
    screen_reset_color(); screen_flush(); usleep(200000);
    for (idx = count - 1; idx >= 0; idx--) {
        screen_set_color_256(CLR_DEATH, -1); screen_put_utf8(px[idx], py[idx], CH_DOT);
        screen_reset_color(); screen_flush(); usleep(math_max(math_div(40000, math_max(count, 1)), 8000));
    }
    usleep(200000);
    for (idx = 0; idx < count; idx++) {
        screen_reset_color(); screen_put_char(px[idx], py[idx], ' '); screen_flush();
        usleep(math_max(math_div(30000, math_max(count, 1)), 5000));
    }
}

/* ── Food ── */
void game_spawn_food(Game *g) {
    int occ;
    if (!g) return;
    do {
        g->food.x = math_rand(1, g->board_w - 2);
        g->food.y = math_rand(1, g->board_h - 2);
        occ = snake_contains(&g->p1, g->food.x, g->food.y);
        if (!occ && g->mode == MODE_MULTI) occ = snake_contains(&g->p2, g->food.x, g->food.y);
        if (!occ && g->bonus_active)
            occ = (g->bonus_food.x == g->food.x && g->bonus_food.y == g->food.y);
    } while (occ);
    screen_set_color_256(CLR_FOOD, -1);
    screen_put_utf8(g->food.x, g->food.y, CH_FOOD);
    screen_reset_color();
}

static void game_spawn_bonus(Game *g) {
    int occ;
    if (!g) return;
    do {
        g->bonus_food.x = math_rand(1, g->board_w - 2);
        g->bonus_food.y = math_rand(1, g->board_h - 2);
        occ = snake_contains(&g->p1, g->bonus_food.x, g->bonus_food.y);
        if (!occ && g->mode == MODE_MULTI) occ = snake_contains(&g->p2, g->bonus_food.x, g->bonus_food.y);
        if (!occ) occ = (g->food.x == g->bonus_food.x && g->food.y == g->bonus_food.y);
    } while (occ);
    g->bonus_active = 1;
    g->bonus_timer  = BONUS_LIFETIME;
    screen_set_color_256(CLR_BONUS, -1);
    screen_put_utf8(g->bonus_food.x, g->bonus_food.y, CH_BONUS);
    screen_reset_color();
}

static void game_erase_bonus(Game *g) {
    if (!g || !g->bonus_active) return;
    screen_reset_color();
    screen_put_char(g->bonus_food.x, g->bonus_food.y, ' ');
    g->bonus_active = 0;
    g->bonus_timer  = 0;
}

/* ── Snake init / cleanup ── */
static void snake_init(Snake *s, int id, int start_x, int start_y, Direction dir,
                       int color_head, int color_body, int initial_len) {
    int i;
    Segment *prev = (Segment *)0;
    s->head = (Segment *)0;
    s->tail = (Segment *)0;
    s->length = 0;
    s->dir = dir;
    s->pending_dir = dir;
    s->has_pending = 0;
    s->score = 0;
    s->alive = 1;
    s->color_head = color_head;
    s->color_body = color_body;
    s->id = id;

    /* Build segments in "head first" order; each new segment trails behind. */
    for (i = 0; i < initial_len; i++) {
        Segment *seg = (Segment *)mem_alloc(sizeof(Segment));
        if (!seg) break;
        if (dir == DIR_RIGHT) { seg->x = start_x - i; seg->y = start_y; }
        else if (dir == DIR_LEFT)  { seg->x = start_x + i; seg->y = start_y; }
        else if (dir == DIR_DOWN)  { seg->x = start_x; seg->y = start_y - i; }
        else                       { seg->x = start_x; seg->y = start_y + i; } /* UP */
        seg->next = (Segment *)0;
        if (!s->head) s->head = seg;
        else          prev->next = seg;
        prev = seg;
        s->length++;
    }
    s->tail = prev;
}

static void snake_cleanup(Snake *s) {
    Segment *curr, *next;
    if (!s) return;
    curr = s->head;
    while (curr) { next = curr->next; mem_free(curr); curr = next; }
    s->head = (Segment *)0;
    s->tail = (Segment *)0;
    s->length = 0;
}

/* ── Public lifecycle ── */
void game_init(Game *g) {
    int tc, tr;
    if (!g) return;
    screen_get_terminal_size(&tc, &tr);
    g->board_w = math_clamp(tc, MIN_BOARD_W, 200);
    g->board_h = math_clamp(tr - 3, MIN_BOARD_H, 60);

    g->base_tick_ms = difficulty_tick_ms(g->difficulty);
    g->tick_ms      = g->base_tick_ms;
    g->state        = STATE_PLAYING;
    g->bonus_active = 0;
    g->bonus_timer  = 0;
    g->ticks_since_food = 0;
    g->winner = 0;

    if (g->mode == MODE_MULTI) {
        int cy = math_div(g->board_h, 2);
        int cxl = math_div(g->board_w, 4);
        int cxr = g->board_w - cxl;
        snake_init(&g->p1, 1, cxl, cy, DIR_RIGHT, CLR_P1_HEAD, CLR_P1_BODY, 4);
        snake_init(&g->p2, 2, cxr, cy, DIR_LEFT,  CLR_P2_HEAD, CLR_P2_BODY, 4);
    } else {
        int cx = math_div(g->board_w, 2);
        int cy = math_div(g->board_h, 2);
        snake_init(&g->p1, 1, cx, cy, DIR_RIGHT, CLR_P1_HEAD, CLR_P1_BODY, 4);
        /* p2 unused */
        g->p2.head = g->p2.tail = (Segment *)0;
        g->p2.length = 0;
        g->p2.alive = 0;
    }

    g->food.x = 0; g->food.y = 0;
    game_spawn_food(g);
    game_full_redraw(g);
}

void game_cleanup(Game *g) {
    if (!g) return;
    snake_cleanup(&g->p1);
    if (g->mode == MODE_MULTI) snake_cleanup(&g->p2);
}

/* ── Input ──
 *
 * The pending-dir buffer gives us same-tick-fairness for multiplayer:
 * each player has their own buffer, so even if both players' bytes
 * arrive in the same drain pass, both get applied at update time.
 * Within a single player, the most recent direction wins (the existing
 * single-player behaviour). 180° reversal is filtered out here so that
 * a freshly-set pending dir that crosses the snake's neck is silently
 * ignored.
 */
void game_set_player_dir(Game *g, int player, Direction d) {
    Snake *s;
    if (!g) return;
    if (player == 1) s = &g->p1;
    else if (player == 2 && g->mode == MODE_MULTI) s = &g->p2;
    else return;
    if (!s->alive) return;
    if (s->length > 1 && is_opposite(s->dir, d)) return;
    s->pending_dir = d;
    s->has_pending = 1;
}

/* ── Update helpers ── */
static int compute_next_head(const Snake *s, const Game *g, Point *out) {
    int nx = s->head->x;
    int ny = s->head->y;
    Direction d = s->has_pending ? s->pending_dir : s->dir;
    /* extra safety: reject 180° at apply time too */
    if (s->length > 1 && is_opposite(s->dir, d)) d = s->dir;

    switch (d) {
        case DIR_UP:    ny--; break;
        case DIR_DOWN:  ny++; break;
        case DIR_LEFT:  nx--; break;
        case DIR_RIGHT: nx++; break;
    }
    if (nx <= 0)              nx = g->board_w - 2;
    if (nx >= g->board_w - 1) nx = 1;
    if (ny <= 0)              ny = g->board_h - 2;
    if (ny >= g->board_h - 1) ny = 1;
    out->x = nx;
    out->y = ny;
    return d;
}

static void redraw_old_head(const Snake *s, int new_head_x, int new_head_y) {
    /* Called AFTER apply_move has prepended the new head:
     *   s->head            → newly-added head
     *   s->head->next      → former head (now a body link)
     *   s->head->next->next → segment after that (or NULL)
     */
    Segment *old_h = s->head->next;
    if (!old_h) return;
    screen_set_color_256(s->color_body, -1);
    if (old_h->next) {
        screen_put_utf8(old_h->x, old_h->y,
            seg_ch(new_head_x, new_head_y, old_h->x, old_h->y, old_h->next->x, old_h->next->y));
    } else {
        int dy = norm_d(old_h->y - new_head_y);
        screen_put_utf8(old_h->x, old_h->y, (dy == 0) ? CH_H : CH_V);
    }
    screen_reset_color();
}

static void apply_move(Snake *s, Point new_head, int grew, int *erased_x, int *erased_y) {
    Segment *new_seg = (Segment *)mem_alloc(sizeof(Segment));
    *erased_x = -1; *erased_y = -1;
    if (!new_seg) { s->alive = 0; return; }
    new_seg->x = new_head.x;
    new_seg->y = new_head.y;
    new_seg->next = s->head;
    s->head = new_seg;

    if (grew) {
        s->length++;
    } else {
        /* remove tail */
        int otx = s->tail->x;
        int oty = s->tail->y;
        if (s->head->next == s->tail) {
            mem_free(s->tail);
            s->head->next = (Segment *)0;
            s->tail = s->head;
        } else {
            Segment *c = s->head;
            while (c->next != s->tail) c = c->next;
            mem_free(s->tail);
            s->tail = c;
            c->next = (Segment *)0;
        }
        *erased_x = otx;
        *erased_y = oty;
    }
}

void game_update(Game *g) {
    Point np1, np2;
    int p1_grew = 0, p2_grew = 0;
    int p1_dies = 0, p2_dies = 0;
    int ate_food_p1 = 0, ate_food_p2 = 0;
    int ate_bonus_p1 = 0, ate_bonus_p2 = 0;
    int erased_x, erased_y;
    Direction new_d1, new_d2 = DIR_RIGHT;

    if (!g || g->state != STATE_PLAYING) return;
    if (!g->p1.alive) return;

    /* Apply per-player pending directions (set by main loop input router) */
    new_d1 = (Direction)compute_next_head(&g->p1, g, &np1);
    if (g->mode == MODE_MULTI) new_d2 = (Direction)compute_next_head(&g->p2, g, &np2);

    /* Commit direction (clear pending) */
    g->p1.dir = new_d1;
    g->p1.has_pending = 0;
    if (g->mode == MODE_MULTI) {
        g->p2.dir = new_d2;
        g->p2.has_pending = 0;
    }

    /* Determine if heads land on food (decided BEFORE collision checks so we
     * know whether tails should move). */
    ate_food_p1  = (np1.x == g->food.x && np1.y == g->food.y);
    ate_bonus_p1 = (g->bonus_active && np1.x == g->bonus_food.x && np1.y == g->bonus_food.y);
    if (g->mode == MODE_MULTI) {
        ate_food_p2  = (np2.x == g->food.x && np2.y == g->food.y);
        ate_bonus_p2 = (g->bonus_active && np2.x == g->bonus_food.x && np2.y == g->bonus_food.y);
        /* If both heads land on the same food simultaneously → P1 eats it
         * (deterministic tie-break, but we'll resolve mutual collision below
         * which is the more important case). */
        if (ate_food_p1 && ate_food_p2) ate_food_p2 = 0;
        if (ate_bonus_p1 && ate_bonus_p2) ate_bonus_p2 = 0;
    }
    p1_grew = ate_food_p1 || ate_bonus_p1;
    p2_grew = ate_food_p2 || ate_bonus_p2;

    /* ── Collision detection ──
     * For each snake we check the new-head cell against:
     *   1. its own body MINUS its tail (if it isn't growing) — tail will move
     *   2. the OTHER snake's body MINUS its tail (if other isn't growing)
     *   3. the OTHER snake's new head position (head-to-head) — symmetric
     */
    {
        /* Self & cross collisions */
        int p1_self    = 0;
        int p2_self    = 0;
        int p1_cross   = 0;
        int p2_cross   = 0;
        int head_clash = 0;
        Segment *c;

        /* p1 vs own body (excluding own tail if not growing) */
        c = g->p1.head;
        while (c) {
            if (c == g->p1.tail && !p1_grew) { c = c->next; continue; }
            if (c->x == np1.x && c->y == np1.y) { p1_self = 1; break; }
            c = c->next;
        }

        if (g->mode == MODE_MULTI) {
            /* p1 vs p2 body */
            c = g->p2.head;
            while (c) {
                if (c == g->p2.tail && !p2_grew) { c = c->next; continue; }
                if (c->x == np1.x && c->y == np1.y) { p1_cross = 1; break; }
                c = c->next;
            }
            /* p2 vs own body */
            c = g->p2.head;
            while (c) {
                if (c == g->p2.tail && !p2_grew) { c = c->next; continue; }
                if (c->x == np2.x && c->y == np2.y) { p2_self = 1; break; }
                c = c->next;
            }
            /* p2 vs p1 body */
            c = g->p1.head;
            while (c) {
                if (c == g->p1.tail && !p1_grew) { c = c->next; continue; }
                if (c->x == np2.x && c->y == np2.y) { p2_cross = 1; break; }
                c = c->next;
            }
            /* head-to-head */
            if (np1.x == np2.x && np1.y == np2.y) head_clash = 1;
        }

        if (p1_self || p1_cross || head_clash) p1_dies = 1;
        if (g->mode == MODE_MULTI && (p2_self || p2_cross || head_clash)) p2_dies = 1;
    }

    if (p1_dies) g->p1.alive = 0;
    if (g->mode == MODE_MULTI && p2_dies) g->p2.alive = 0;

    /* If anyone died, end the game (do NOT advance a half-state). */
    if (!g->p1.alive || (g->mode == MODE_MULTI && !g->p2.alive)) {
        if (g->mode == MODE_MULTI) {
            if (!g->p1.alive && !g->p2.alive) g->winner = 3;
            else if (!g->p1.alive)            g->winner = 2;
            else                              g->winner = 1;
            if (g->p1.alive == 0) death_animate_snake(&g->p1);
            if (g->p2.alive == 0) death_animate_snake(&g->p2);
        } else {
            g->winner = 0;
            death_animate_snake(&g->p1);
        }
        g->state = STATE_GAMEOVER;
        return;
    }

    /* ── Advance P1 ── */
    {
        screen_set_color_256(g->p1.color_head, -1);
        screen_put_utf8(np1.x, np1.y, head_ch(g->p1.dir));
        screen_reset_color();
        apply_move(&g->p1, np1, p1_grew, &erased_x, &erased_y);
        redraw_old_head(&g->p1, np1.x, np1.y);
        if (erased_x >= 0) { screen_reset_color(); screen_put_char(erased_x, erased_y, ' '); }
        if (ate_food_p1) {
            g->p1.score += 1;
            g->ticks_since_food = 0;
            g->tick_ms = math_max(g->tick_ms - SPEED_DECREASE, MIN_TICK_MS);
        } else if (ate_bonus_p1) {
            g->p1.score += 5;
            g->bonus_active = 0; g->bonus_timer = 0;
            g->tick_ms = math_max(g->tick_ms - math_mul(SPEED_DECREASE, 2), MIN_TICK_MS);
        }
    }

    /* ── Advance P2 ── */
    if (g->mode == MODE_MULTI) {
        screen_set_color_256(g->p2.color_head, -1);
        screen_put_utf8(np2.x, np2.y, head_ch(g->p2.dir));
        screen_reset_color();
        apply_move(&g->p2, np2, p2_grew, &erased_x, &erased_y);
        redraw_old_head(&g->p2, np2.x, np2.y);
        if (erased_x >= 0) { screen_reset_color(); screen_put_char(erased_x, erased_y, ' '); }
        if (ate_food_p2) {
            g->p2.score += 1;
            g->ticks_since_food = 0;
            g->tick_ms = math_max(g->tick_ms - SPEED_DECREASE, MIN_TICK_MS);
        } else if (ate_bonus_p2) {
            g->p2.score += 5;
            g->bonus_active = 0; g->bonus_timer = 0;
            g->tick_ms = math_max(g->tick_ms - math_mul(SPEED_DECREASE, 2), MIN_TICK_MS);
        }
    }

    /* High score: max of either snake's score in this run */
    {
        int s = g->p1.score;
        if (g->mode == MODE_MULTI && g->p2.score > s) s = g->p2.score;
        if (s > g->high_score) g->high_score = s;
    }

    /* Respawn food if eaten */
    if (ate_food_p1 || ate_food_p2) game_spawn_food(g);

    /* Bonus food lifecycle */
    g->ticks_since_food++;
    if (g->bonus_active) {
        g->bonus_timer--;
        if (g->bonus_timer <= 0) game_erase_bonus(g);
    } else if ((g->p1.score > 0 || (g->mode == MODE_MULTI && g->p2.score > 0)) &&
               math_rand(1, 100) <= BONUS_CHANCE) {
        game_spawn_bonus(g);
    }
}

/* ── Render frame ── */
void game_render(const Game *g) {
    if (!g) return;
    draw_hud(g);

    if (g->state == STATE_GAMEOVER) {
        int cx = math_div(g->board_w, 2);
        int cy = math_div(g->board_h, 2);
        char buf[32];
        screen_set_color(97, 41);
        screen_put_str(cx - 7, cy, "  GAME  OVER  ");
        screen_reset_color();

        if (g->mode == MODE_MULTI) {
            const char *winmsg;
            if      (g->winner == 1) winmsg = "Player 1 wins!";
            else if (g->winner == 2) winmsg = "Player 2 wins!";
            else                     winmsg = "Draw!";
            screen_set_color_256(CLR_SCORE_V, -1);
            screen_put_str(cx - math_div(str_len(winmsg), 2), cy + 2, winmsg);

            screen_set_color_256(CLR_P1_HEAD, -1);
            screen_put_str(cx - 12, cy + 4, "P1: ");
            int_to_str(g->p1.score, buf, 32);
            screen_set_color_256(CLR_SCORE_V, -1);
            screen_put_str(cx - 8, cy + 4, buf);

            screen_set_color_256(CLR_P2_HEAD, -1);
            screen_put_str(cx + 2, cy + 4, "P2: ");
            int_to_str(g->p2.score, buf, 32);
            screen_set_color_256(CLR_SCORE_V, -1);
            screen_put_str(cx + 6, cy + 4, buf);
        } else {
            screen_set_color_256(CLR_SCORE_V, -1);
            int_to_str(g->p1.score, buf, 32);
            screen_put_str(cx - 7, cy + 2, "Final Score: ");
            screen_put_str(cx + 6, cy + 2, buf);
        }

        screen_set_color_256(CLR_SPEED_L, -1);
        screen_put_str(cx - 13, cy + 6, "R: Restart   M: Menu   Q: Quit");
        screen_reset_color();
    }

    screen_flush();
}

int game_is_running(const Game *g) {
    if (!g) return 0;
    return (g->state != STATE_GAMEOVER);
}

/* ── Full redraw (after resize or fresh start) ── */
static void redraw_snake(const Snake *s, Direction global_dir) {
    Segment *prev = (Segment *)0, *curr, *next;
    int idx = 0;
    if (!s || !s->head) return;
    curr = s->head;
    while (curr) {
        next = curr->next;
        if (idx == 0) {
            screen_set_color_256(s->color_head, -1);
            screen_put_utf8(curr->x, curr->y, head_ch(global_dir));
        } else {
            screen_set_color_256(s->color_body, -1);
            if (prev && next) {
                screen_put_utf8(curr->x, curr->y,
                    seg_ch(prev->x, prev->y, curr->x, curr->y, next->x, next->y));
            } else if (prev) {
                int dy = norm_d(curr->y - prev->y);
                screen_put_utf8(curr->x, curr->y, (dy == 0) ? CH_H : CH_V);
            } else {
                screen_put_utf8(curr->x, curr->y, CH_H);
            }
        }
        screen_reset_color();
        prev = curr; curr = next; idx++;
    }
}

void game_full_redraw(Game *g) {
    if (!g) return;
    screen_clear();
    screen_set_color_256(CLR_BORDER, -1);
    screen_draw_border(g->board_w, g->board_h);
    screen_reset_color();
    draw_title(g);

    if (g->state == STATE_PLAYING) {
        redraw_snake(&g->p1, g->p1.dir);
        if (g->mode == MODE_MULTI) redraw_snake(&g->p2, g->p2.dir);

        screen_set_color_256(CLR_FOOD, -1);
        screen_put_utf8(g->food.x, g->food.y, CH_FOOD);
        screen_reset_color();
        if (g->bonus_active) {
            screen_set_color_256(CLR_BONUS, -1);
            screen_put_utf8(g->bonus_food.x, g->bonus_food.y, CH_BONUS);
            screen_reset_color();
        }
    }

    draw_hud(g);
    screen_flush();
}

/* Internal helper: tag accessor used by main.c via header-less linkage. */
const char *game_score_tag(const Game *g) {
    return mode_tag(g->mode, g->difficulty);
}
