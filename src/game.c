#include "../include/game.h"
#include "../include/memory.h"
#include "../include/string.h"
#include "../include/math.h"
#include "../include/screen.h"

/*
 * game.c — Core game state & logic
 *
 * Rendering strategy (dirty-rectangle):
 *   - Border drawn ONCE in game_init
 *   - Food drawn ONCE when spawned
 *   - Each tick: draw new head + erase old tail
 *   - game_render only updates score HUD and game over text
 *   - No full-screen redraw = zero flicker
 */

void game_spawn_food(Game *g) {
    Segment *curr;
    int on_snake;

    if (!g) return;

    /* keep generating until food is NOT on any snake segment */
    do {
        g->food.x = math_rand(1, g->board_w - 2);
        g->food.y = math_rand(1, g->board_h - 2);

        on_snake = 0;
        curr = g->head;
        while (curr) {
            if (curr->x == g->food.x && curr->y == g->food.y) {
                on_snake = 1;
                break;
            }
            curr = curr->next;
        }
    } while (on_snake);

    /* draw food immediately */
    screen_set_color(31, 40);  /* red on black */
    screen_put_char(g->food.x, g->food.y, '*');
    screen_reset_color();
}

void game_init(Game *g) {
    Segment *first_obj;
    
    if (!g) return;

    /* Configuration */
    g->board_w = 40;
    g->board_h = 20;
    g->tick_ms = 150;
    g->score = 0;
    g->high_score = 0;
    g->state = STATE_PLAYING;
    g->dir = DIR_RIGHT;
    g->length = 1;

    /* Initialize snake with 1 segment at center */
    first_obj = (Segment *)mem_alloc(sizeof(Segment));
    if (first_obj) {
        first_obj->x = g->board_w / 2;  /* center x */
        first_obj->y = g->board_h / 2;  /* center y */
        first_obj->next = (Segment *)0;
    }
    
    g->head = first_obj;
    g->tail = first_obj;

    /* ── Draw border ONCE ── */
    screen_set_color(33, 40);  /* yellow on black */
    screen_draw_border(g->board_w, g->board_h);

    /* ── Draw initial snake ── */
    screen_set_color(32, 40);  /* green on black */
    screen_put_char(first_obj->x, first_obj->y, 'O');

    /* ── Draw initial score ── */
    screen_reset_color();
    screen_put_str(2, g->board_h, "Score: 0");

    /* Spawn initial food (draws it too) */
    game_spawn_food(g);

    screen_flush();
}

void game_handle_input(Game *g, char key) {
    if (!g) return;

    switch (key) {
        case 'w': case 'W':
            if (g->dir != DIR_DOWN) g->dir = DIR_UP;
            break;
        case 's': case 'S':
            if (g->dir != DIR_UP) g->dir = DIR_DOWN;
            break;
        case 'a': case 'A':
            if (g->dir != DIR_RIGHT) g->dir = DIR_LEFT;
            break;
        case 'd': case 'D':
            if (g->dir != DIR_LEFT) g->dir = DIR_RIGHT;
            break;
        case 'q': case 'Q':
            g->state = STATE_GAMEOVER;
            break;
        default:
            break;
    }
}

void game_update(Game *g) {
    Segment *new_head;
    Segment *curr;
    int new_x, new_y;
    int ate_food;
    int old_tail_x, old_tail_y;

    if (!g || g->state != STATE_PLAYING) return;

    /* ── 1. Calculate new head position based on direction ── */
    new_x = g->head->x;
    new_y = g->head->y;

    switch (g->dir) {
        case DIR_UP:    new_y--; break;
        case DIR_DOWN:  new_y++; break;
        case DIR_LEFT:  new_x--; break;
        case DIR_RIGHT: new_x++; break;
    }

    /* ── 2. Check wall collision ── */
    if (new_x <= 0 || new_x >= g->board_w - 1 ||
        new_y <= 0 || new_y >= g->board_h - 1) {
        g->state = STATE_GAMEOVER;
        return;
    }

    /* ── 3. Check self-collision ── */
    curr = g->head;
    while (curr) {
        if (curr->x == new_x && curr->y == new_y) {
            g->state = STATE_GAMEOVER;
            return;
        }
        curr = curr->next;
    }

    /* ── 4. Allocate new head segment ── */
    new_head = (Segment *)mem_alloc(sizeof(Segment));
    if (!new_head) {
        g->state = STATE_GAMEOVER;
        return;
    }
    new_head->x    = new_x;
    new_head->y    = new_y;
    new_head->next = g->head;
    g->head        = new_head;

    /* ── 5. Draw the new head ── */
    screen_set_color(32, 40);  /* green on black */
    screen_put_char(new_x, new_y, 'O');

    /* ── 6. Check if food was eaten ── */
    ate_food = (new_x == g->food.x && new_y == g->food.y);

    if (ate_food) {
        g->score++;
        g->length++;
        game_spawn_food(g);  /* also draws new food */
    } else {
        /* ── 7. Save old tail position, then remove tail ── */
        old_tail_x = g->tail->x;
        old_tail_y = g->tail->y;

        if (g->head->next == g->tail) {
            /* only 2 nodes: head → tail, just free tail */
            mem_free(g->tail);
            g->head->next = (Segment *)0;
            g->tail = g->head;
        } else {
            /* walk to the second-to-last segment */
            curr = g->head;
            while (curr->next != g->tail) {
                curr = curr->next;
            }
            mem_free(g->tail);
            g->tail    = curr;
            curr->next = (Segment *)0;
        }

        /* ── 8. Erase old tail position ── */
        screen_reset_color();
        screen_put_char(old_tail_x, old_tail_y, ' ');
    }
}

void game_render(const Game *g) {
    char score_buf[32];

    if (!g) return;

    /* ── Only update score HUD (changes each frame food is eaten) ── */
    screen_reset_color();
    int_to_str(g->score, score_buf, 32);
    screen_put_str(2, g->board_h, "Score: ");
    screen_put_str(9, g->board_h, score_buf);
    screen_put_str(12, g->board_h, "  ");  /* clear trailing digits */

    /* ── Game over message ── */
    if (g->state == STATE_GAMEOVER) {
        screen_set_color(37, 41);  /* white on red */
        screen_put_str(g->board_w / 2 - 5, g->board_h / 2, "GAME OVER!");
        screen_reset_color();
        screen_put_str(g->board_w / 2 - 8, g->board_h / 2 + 1, "Press 'q' to quit");
    }

    screen_flush();
}

int game_is_running(const Game *g) {
    if (!g) return 0;
    return (g->state != STATE_GAMEOVER);
}

void game_cleanup(Game *g) {
    Segment *curr;
    Segment *next;

    if (!g) return;

    /* free all segments in the linked list */
    curr = g->head;
    while (curr) {
        next = curr->next;
        mem_free(curr);
        curr = next;
    }

    g->head   = (Segment *)0;
    g->tail   = (Segment *)0;
    g->length = 0;
}
