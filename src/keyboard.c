#include "../include/keyboard.h"
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>

/*
 * keyboard.c — Non-blocking keyboard input via termios
 *
 * Uses only read() for input — no stdio mixing.
 *
 *   kb_init()      saves original settings, switches to raw mode
 *   kb_cleanup()   restores original settings (TCSAFLUSH)
 *   keyPressed()   reads into last_key via read(), returns 1 if available
 *   readKey()      returns last_key and resets it to 0
 */

/* ── Globals ── */

static struct termios orig_termios;  /* saved terminal settings */
static int            orig_flags;    /* saved fcntl flags       */
static char           last_key;      /* last key read           */

/* ── Public API ── */

void kb_init(void) {
    struct termios raw;

    /* save original terminal settings */
    tcgetattr(STDIN_FILENO, &orig_termios);

    /* copy and modify for raw mode */
    raw = orig_termios;
    raw.c_lflag &= ~(ICANON | ECHO);  /* disable canonical mode + echo */
    raw.c_cc[VMIN]  = 0;              /* read() returns immediately     */
    raw.c_cc[VTIME] = 0;              /* no timeout                     */
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);

    /* save original fcntl flags and set non-blocking */
    orig_flags = fcntl(STDIN_FILENO, F_GETFL, 0);
    fcntl(STDIN_FILENO, F_SETFL, orig_flags | O_NONBLOCK);

    last_key = 0;
}

void kb_cleanup(void) {
    /* restore original terminal settings */
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);

    /* restore original fcntl flags */
    fcntl(STDIN_FILENO, F_SETFL, orig_flags);
}

int keyPressed(void) {
    /* if we already have a buffered key, report it */
    if (last_key != 0) {
        return 1;
    }

    if ((int)read(STDIN_FILENO, &last_key, 1) > 0) {
        return 1;
    }

    return 0;
}

char readKey(void) {
    char key = last_key;
    char seq[2];

    last_key = 0;

    /* Check for escape sequence (arrow keys) */
    if (key == 27) {
        /* Read the next two bytes if available immediately */
        if (read(STDIN_FILENO, &seq[0], 1) == 1) {
            if (read(STDIN_FILENO, &seq[1], 1) == 1) {
                if (seq[0] == '[') {
                    switch (seq[1]) {
                        case 'A': return 'w'; /* Up */
                        case 'B': return 's'; /* Down */
                        case 'C': return 'd'; /* Right */
                        case 'D': return 'a'; /* Left */
                    }
                }
            }
        }
    }

    return key;
}
