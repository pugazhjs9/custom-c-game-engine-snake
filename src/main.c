#include "../include/memory.h"
#include "../include/math.h"
#include "../include/screen.h"
#include "../include/keyboard.h"
#include "../include/game.h"
#include <unistd.h>
#include <time.h>

/*
 * main.c — Entry point
 *
 * Lifecycle:
 *   1. Initialize subsystems (memory, math seed, screen, keyboard)
 *   2. Initialize game state
 *   3. Run game loop: input → update → render → delay
 *   4. Cleanup on exit
 */

int main(void) {
    Game game = {0};
    int elapsed;

    /* ── INIT ── */
    mem_init();
    math_seed((unsigned int)time(NULL));
    screen_init(40, 20);
    kb_init();
    game_init(&game);

    /* ── GAME LOOP ── */
    while (1) {
        /* input */
        if (keyPressed()) {
            char key = readKey();

            /* quit on 'q' regardless of state */
            if (key == 'q' || key == 'Q') {
                break;
            }

            game_handle_input(&game, key);
        }

        /* logic — only update when playing */
        if (game.state == STATE_PLAYING) {
            game_update(&game);
        }

        /* render — always draw (game over screen stays visible) */
        game_render(&game);

        /* delay — sleep in small chunks for responsive input */
        elapsed = 0;
        while (elapsed < game.tick_ms) {
            usleep(10 * 1000);  /* 10ms chunks */
            elapsed += 10;

            /* break early if a key is waiting */
            if (keyPressed()) break;
        }
    }

    /* ── CLEANUP ── */
    game_cleanup(&game);
    kb_cleanup();
    screen_cleanup();

    return 0;
}
