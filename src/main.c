#include "../include/memory.h"
#include "../include/math.h"
#include "../include/screen.h"
#include "../include/keyboard.h"
#include "../include/game.h"
#include "../include/menu.h"
#include "../include/ai.h"
#include "../include/score.h"
#include <unistd.h>
#include <time.h>
#include <signal.h>
#include <sys/ioctl.h>

/*
 * main.c — Entry point
 *
 *   1. Init subsystems (memory pool, RNG, screen, keyboard, signals).
 *   2. Show the main menu and pick a mode + difficulty.
 *   3. Run a game loop with per-player pending direction buffers — this
 *      is what gives multiplayer "fairness" when both players press in
 *      the same millisecond: each tick drains stdin, routes bytes to
 *      P1 or P2, and BOTH pending dirs are applied at update time.
 *   4. On game over, wait for R / M / Q.
 *   5. Persist high-score per mode/difficulty (custom POSIX I/O).
 */

const char *game_score_tag(const Game *g);  /* defined in game.c */

static volatile int resize_flag = 0;

static void handle_sigwinch(int sig) { (void)sig; resize_flag = 1; }

static void clamp_after_resize(Game *game) {
    int tc, tr;
    Segment *seg;
    screen_get_terminal_size(&tc, &tr);
    game->board_w = math_clamp(tc, 25, 200);
    game->board_h = math_clamp(tr - 3, 12, 60);

    seg = game->p1.head;
    while (seg) {
        seg->x = math_clamp(seg->x, 1, game->board_w - 2);
        seg->y = math_clamp(seg->y, 1, game->board_h - 2);
        seg = seg->next;
    }
    if (game->mode == MODE_MULTI) {
        seg = game->p2.head;
        while (seg) {
            seg->x = math_clamp(seg->x, 1, game->board_w - 2);
            seg->y = math_clamp(seg->y, 1, game->board_h - 2);
            seg = seg->next;
        }
    }
    game->food.x = math_clamp(game->food.x, 1, game->board_w - 2);
    game->food.y = math_clamp(game->food.y, 1, game->board_h - 2);
    if (game->bonus_active) {
        game->bonus_food.x = math_clamp(game->bonus_food.x, 1, game->board_w - 2);
        game->bonus_food.y = math_clamp(game->bonus_food.y, 1, game->board_h - 2);
    }
}

/* Save current run's score if it beats the loaded high-score. */
static void persist_highscore(Game *g) {
    int s = g->p1.score;
    if (g->mode == MODE_MULTI && g->p2.score > s) s = g->p2.score;
    if (s > g->loaded_high_score) {
        g->loaded_high_score = s;
        score_save(game_score_tag(g), s);
    }
}


/* Run a single game session. Returns:
 *   0 = quit application
 *   1 = back to menu
 *   2 = restart same mode/difficulty
 */
static int run_game_session(Game *game) {
    int sleep_chunk = math_mul(10, 1000);
    int p1_pending = -1, p2_pending = -1;
    int restart_request = 0, menu_request = 0, quit_request = 0;
    int elapsed, current_delay;

    /* Load high score for this mode */
    game->loaded_high_score = score_load(game_score_tag(game));
    game->high_score = game->loaded_high_score;
    game_full_redraw(game);

    while (1) {
        /* Resize */
        if (resize_flag) {
            resize_flag = 0;
            clamp_after_resize(game);
            game_full_redraw(game);
        }

        /* Drain ALL pending input bytes per tick.
         *
         * Race-condition note: when both players press a key in the
         * same millisecond their bytes both end up in the stdin buffer.
         * Because we drain *every* byte and route each into its OWN
         * pending slot (last-press-per-player wins), neither player
         * starves the other. Both pending dirs are then applied
         * atomically by game_update at tick boundary. */
        p1_pending = -1;
        p2_pending = -1;
        restart_request = 0;
        menu_request = 0;
        quit_request = 0;

        while (keyPressed()) {
            int key = readKey();
            if (key == 'q' || key == 'Q') { quit_request = 1; break; }
            else if (key == 'r' || key == 'R') { restart_request = 1; }
            else if (key == 'm' || key == 'M') { menu_request = 1; }
            else if (game->mode == MODE_MULTI) {
                switch (key) {
                    case 'w': case 'W': p1_pending = DIR_UP;    break;
                    case 's': case 'S': p1_pending = DIR_DOWN;  break;
                    case 'a': case 'A': p1_pending = DIR_LEFT;  break;
                    case 'd': case 'D': p1_pending = DIR_RIGHT; break;
                    case KEY_UP:    p2_pending = DIR_UP;    break;
                    case KEY_DOWN:  p2_pending = DIR_DOWN;  break;
                    case KEY_LEFT:  p2_pending = DIR_LEFT;  break;
                    case KEY_RIGHT: p2_pending = DIR_RIGHT; break;
                    default: break;
                }
            } else if (game->mode == MODE_SINGLE) {
                switch (key) {
                    case 'w': case 'W': case KEY_UP:    p1_pending = DIR_UP;    break;
                    case 's': case 'S': case KEY_DOWN:  p1_pending = DIR_DOWN;  break;
                    case 'a': case 'A': case KEY_LEFT:  p1_pending = DIR_LEFT;  break;
                    case 'd': case 'D': case KEY_RIGHT: p1_pending = DIR_RIGHT; break;
                    default: break;
                }
            }
            /* MODE_AI ignores direction keys — AI drives P1 */
        }

        if (quit_request) { persist_highscore(game); return 0; }

        if (game->state == STATE_GAMEOVER) {
            if (restart_request) { persist_highscore(game); return 2; }
            if (menu_request)    { persist_highscore(game); return 1; }
            usleep(sleep_chunk);
            continue;
        }

        /* AI mode: compute P1 direction every tick */
        if (game->mode == MODE_AI && game->state == STATE_PLAYING) {
            p1_pending = (int)ai_decide(game);
        }

        /* Apply pending dirs (does opposite-direction filtering) */
        if (p1_pending >= 0) game_set_player_dir(game, 1, (Direction)p1_pending);
        if (p2_pending >= 0 && game->mode == MODE_MULTI)
            game_set_player_dir(game, 2, (Direction)p2_pending);

        /* Update */
        if (game->state == STATE_PLAYING) game_update(game);

        /* Render */
        game_render(game);

        /* Save high-score on game over */
        if (game->state == STATE_GAMEOVER) {
            persist_highscore(game);
        }

        /* Delay — vertical gets 2x to compensate for tall terminal cells. */
        if (game->p1.dir == DIR_UP || game->p1.dir == DIR_DOWN) {
            current_delay = math_mul(game->tick_ms, 2);
        } else {
            current_delay = game->tick_ms;
        }

        elapsed = 0;
        while (elapsed < current_delay) {
            usleep(sleep_chunk);
            elapsed += 10;
            if (keyPressed()) break;
            if (resize_flag)  break;
        }
    }
}

int main(void) {
    int tc, tr;
    int rc;

    mem_init();
    math_seed((unsigned int)time((time_t *)0));
    screen_get_terminal_size(&tc, &tr);
    screen_init(tc, tr);
    kb_init();
    signal(SIGWINCH, handle_sigwinch);

    /* Outer loop: menu -> game -> menu/restart/quit */
    while (1) {
        Game game;
        MenuResult mr;
        int board_w, board_h;
        char *p; int i;

        /* Re-query terminal size each iteration in case it changed */
        screen_get_terminal_size(&tc, &tr);
        board_w = math_clamp(tc, 25, 200);
        board_h = math_clamp(tr - 3, 12, 60);

        mr = menu_run(board_w, board_h);
        if (mr.quit) break;

        /* Zero-init game */
        p = (char *)&game;
        for (i = 0; i < (int)sizeof(Game); i++) p[i] = 0;
        game.mode = mr.mode;
        game.difficulty = mr.difficulty;
        game_init(&game);

        rc = 1;
        while (rc == 1 || rc == 2) {
            if (rc == 2) {
                /* Restart in the same mode/difficulty */
                game_cleanup(&game);
                p = (char *)&game;
                for (i = 0; i < (int)sizeof(Game); i++) p[i] = 0;
                game.mode = mr.mode;
                game.difficulty = mr.difficulty;
                game_init(&game);
            }
            rc = run_game_session(&game);
            if (rc == 1) { game_cleanup(&game); break; }      /* back to menu */
            if (rc == 0) { game_cleanup(&game); goto quit; }  /* hard quit    */
            /* rc == 2: loop and restart */
        }
    }

quit:
    kb_cleanup();
    screen_cleanup();
    return 0;
}
