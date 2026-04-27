#include "../include/memory.h"
#include "../include/math.h"
#include "../include/screen.h"
#include "../include/keyboard.h"
#include "../include/game.h"
#include <unistd.h>
#include <time.h>
#include <signal.h>
#include <sys/ioctl.h>

/*
 * main.c — Entry point
 * All arithmetic uses math.h helpers.
 */

static volatile int resize_flag = 0;

static void handle_sigwinch(int sig) {
    (void)sig;
    resize_flag = 1;
}

int main(void) {
    Game game;
    int elapsed, sleep_chunk, current_delay;
    int tc, tr;
    int should_quit;

    /* Zero-init */
    {
        char *p = (char *)&game;
        int i, sz = (int)sizeof(Game);
        for (i = 0; i < sz; i++) p[i] = 0;
    }

    mem_init();
    math_seed((unsigned int)time((time_t *)0));
    screen_get_terminal_size(&tc, &tr);
    screen_init(tc, tr);
    kb_init();
    signal(SIGWINCH, handle_sigwinch);
    game_init(&game);

    sleep_chunk = math_mul(10, 1000);

    while (1) {
        /* Resize */
        if (resize_flag) {
            resize_flag = 0;
            screen_get_terminal_size(&tc, &tr);
            game.board_w = math_clamp(tc, 25, 200);
            game.board_h = math_clamp(tr - 3, 12, 60);
            {
                Segment *seg = game.head;
                while (seg) {
                    seg->x = math_clamp(seg->x, 1, game.board_w - 2);
                    seg->y = math_clamp(seg->y, 1, game.board_h - 2);
                    seg = seg->next;
                }
                game.food.x = math_clamp(game.food.x, 1, game.board_w - 2);
                game.food.y = math_clamp(game.food.y, 1, game.board_h - 2);
                if (game.bonus_active) {
                    game.bonus_food.x = math_clamp(game.bonus_food.x, 1, game.board_w - 2);
                    game.bonus_food.y = math_clamp(game.bonus_food.y, 1, game.board_h - 2);
                }
            }
            game_full_redraw(&game);
        }

        /* Input: drain ALL pending keys */
        should_quit = 0;
        {
            char last_dir = 0;
            while (keyPressed()) {
                char key = readKey();
                if (key == 'q' || key == 'Q') { should_quit = 1; break; }
                if (key == 'r' || key == 'R') { game_handle_input(&game, key); }
                else { last_dir = key; }
            }
            if (last_dir && !should_quit) game_handle_input(&game, last_dir);
        }
        if (should_quit) break;

        /* Update */
        if (game.state == STATE_PLAYING) game_update(&game);

        /* Render */
        game_render(&game);

        /* Delay — vertical gets 2x to compensate for tall terminal cells */
        if (game.dir == DIR_UP || game.dir == DIR_DOWN) {
            current_delay = math_mul(game.tick_ms, 2);
        } else {
            current_delay = game.tick_ms;
        }

        elapsed = 0;
        while (elapsed < current_delay) {
            usleep(sleep_chunk);
            elapsed += 10;
            if (keyPressed()) break;
            if (resize_flag) break;
        }
    }

    game_cleanup(&game);
    kb_cleanup();
    screen_cleanup();
    return 0;
}
