#include "../include/ai.h"
#include "../include/game.h"

/*
 * ai.c — Auto-play snake AI
 *
 * Strategy: breadth-first search from the snake's head to the food,
 * treating snake bodies as obstacles. The first move along the
 * shortest path is returned.
 *
 * Wraparound is supported (matching game_update). Walls (the border
 * cells at x=0/x=board_w-1/y=0/y=board_h-1) are not traversable and
 * BFS uses the wrapped neighbour, exactly like a moving head would.
 *
 * If no path exists, fall back to any direction that does not result
 * in immediate death. If every direction is fatal, return the current
 * direction (snake is doomed; let the death animation play).
 *
 * Static buffers are sized to comfortably exceed the gameplay clamps
 * defined in game.c (board_w ≤ 200, board_h ≤ 60).
 */

#define AI_MAX_W 210
#define AI_MAX_H 70
#define AI_MAX_CELLS (AI_MAX_W * AI_MAX_H)

static int  visited[AI_MAX_H][AI_MAX_W];
static int  parent[AI_MAX_H][AI_MAX_W];   /* direction taken to enter this cell */
static int  qx[AI_MAX_CELLS];
static int  qy[AI_MAX_CELLS];

static const int DX[4] = { 0,  0, -1,  1 }; /* UP, DOWN, LEFT, RIGHT */
static const int DY[4] = {-1,  1,  0,  0 };

static int wrap_x(int x, int w) {
    if (x <= 0) return w - 2;
    if (x >= w - 1) return 1;
    return x;
}
static int wrap_y(int y, int h) {
    if (y <= 0) return h - 2;
    if (y >= h - 1) return 1;
    return y;
}

static int is_blocked_by_snake(const Game *g, int x, int y) {
    Segment *s;
    /* p1 body */
    s = g->p1.head;
    while (s) { if (s->x == x && s->y == y) return 1; s = s->next; }
    /* p2 body (only if multi mode and alive) */
    if (g->mode == MODE_MULTI) {
        s = g->p2.head;
        while (s) { if (s->x == x && s->y == y) return 1; s = s->next; }
    }
    return 0;
}

static int opposite_dir(Direction d) {
    if (d == DIR_UP)    return DIR_DOWN;
    if (d == DIR_DOWN)  return DIR_UP;
    if (d == DIR_LEFT)  return DIR_RIGHT;
    return DIR_LEFT;
}

static int dir_is_safe(const Game *g, Direction d) {
    int hx = g->p1.head->x;
    int hy = g->p1.head->y;
    int nx = hx + DX[d];
    int ny = hy + DY[d];
    nx = wrap_x(nx, g->board_w);
    ny = wrap_y(ny, g->board_h);
    if (is_blocked_by_snake(g, nx, ny)) return 0;
    return 1;
}

Direction ai_decide(const Game *g) {
    int hx, hy, fx, fy;
    int qhead, qtail;
    int i, j;
    int found;
    int cx, cy, nx, ny;
    int trace_x, trace_y;
    int first_dir;
    int d;

    if (!g || !g->p1.head) return DIR_RIGHT;

    hx = g->p1.head->x;
    hy = g->p1.head->y;
    fx = g->food.x;
    fy = g->food.y;

    /* Reset BFS state. We only need to clear the playfield region. */
    for (i = 0; i < AI_MAX_H; i++) {
        for (j = 0; j < AI_MAX_W; j++) {
            visited[i][j] = 0;
            parent[i][j] = -1;
        }
    }

    qhead = 0;
    qtail = 0;
    qx[qtail] = hx;
    qy[qtail] = hy;
    qtail++;
    visited[hy][hx] = 1;

    found = 0;

    while (qhead < qtail) {
        cx = qx[qhead];
        cy = qy[qhead];
        qhead++;

        if (cx == fx && cy == fy) { found = 1; break; }

        for (d = 0; d < 4; d++) {
            nx = cx + DX[d];
            ny = cy + DY[d];
            nx = wrap_x(nx, g->board_w);
            ny = wrap_y(ny, g->board_h);

            if (nx < 1 || nx > g->board_w - 2) continue;
            if (ny < 1 || ny > g->board_h - 2) continue;
            if (visited[ny][nx]) continue;
            /* Don't treat the food cell as blocked even if (rare race) it
             * would be — also don't include the destination food as a body
             * collision check (it isn't).                                  */
            if (!(nx == fx && ny == fy) && is_blocked_by_snake(g, nx, ny)) continue;

            visited[ny][nx] = 1;
            parent[ny][nx] = d;
            qx[qtail] = nx;
            qy[qtail] = ny;
            qtail++;
        }
    }

    if (found) {
        /* Walk back from food to head; remember the very first move. */
        trace_x = fx;
        trace_y = fy;
        first_dir = -1;
        while (!(trace_x == hx && trace_y == hy)) {
            int pd = parent[trace_y][trace_x];
            if (pd < 0) break; /* shouldn't happen */
            first_dir = pd;
            /* Step backwards along DX/DY[pd]. We came INTO (trace) from this
             * dir, so previous cell is trace - DX/DY[pd] (with wrap).         */
            trace_x = trace_x - DX[pd];
            trace_y = trace_y - DY[pd];
            trace_x = wrap_x(trace_x, g->board_w);
            trace_y = wrap_y(trace_y, g->board_h);
        }
        if (first_dir >= 0) {
            /* Avoid reversing into our own neck if snake length > 1. */
            if (g->p1.length > 1 && first_dir == opposite_dir(g->p1.dir)) {
                /* Try the other safe directions */
                for (d = 0; d < 4; d++) {
                    if (d == opposite_dir(g->p1.dir)) continue;
                    if (dir_is_safe(g, (Direction)d)) return (Direction)d;
                }
                return g->p1.dir;
            }
            return (Direction)first_dir;
        }
    }

    /* Fallback: pick any safe direction, preferring continuing forward. */
    if (dir_is_safe(g, g->p1.dir)) return g->p1.dir;
    for (d = 0; d < 4; d++) {
        if (g->p1.length > 1 && d == opposite_dir(g->p1.dir)) continue;
        if (dir_is_safe(g, (Direction)d)) return (Direction)d;
    }
    return g->p1.dir;
}
