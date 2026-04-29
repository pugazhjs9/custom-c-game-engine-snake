#include "../include/keyboard.h"
#include <termios.h>
#include <unistd.h>
#include <fcntl.h>

/*
 * keyboard.c — Non-blocking keyboard input via termios
 *
 * Returns:
 *   - printable ASCII for letters / digits / punctuation
 *   - KEY_UP / KEY_DOWN / KEY_LEFT / KEY_RIGHT for arrow keys
 *   - KEY_ENTER (10) or KEY_CR (13) for Return
 *   - KEY_ESC for a bare Escape press
 */

static struct termios orig_termios;  /* saved terminal settings */
static int            orig_flags;    /* saved fcntl flags       */
static unsigned char  last_key;      /* last raw byte read      */

void kb_init(void) {
    struct termios raw;

    tcgetattr(STDIN_FILENO, &orig_termios);

    raw = orig_termios;
    raw.c_lflag &= ~(ICANON | ECHO);
    raw.c_cc[VMIN]  = 0;
    raw.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);

    orig_flags = fcntl(STDIN_FILENO, F_GETFL, 0);
    fcntl(STDIN_FILENO, F_SETFL, orig_flags | O_NONBLOCK);

    last_key = 0;
}

void kb_cleanup(void) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
    fcntl(STDIN_FILENO, F_SETFL, orig_flags);
}

int keyPressed(void) {
    if (last_key != 0) {
        return 1;
    }
    if ((int)read(STDIN_FILENO, &last_key, 1) > 0) {
        return 1;
    }
    return 0;
}

int readKey(void) {
    int  key = (int)last_key;
    char seq[2];

    last_key = 0;

    if (key == 27) {
        /* possible escape sequence — try to read 2 more bytes */
        if (read(STDIN_FILENO, &seq[0], 1) == 1) {
            if (read(STDIN_FILENO, &seq[1], 1) == 1) {
                if (seq[0] == '[') {
                    switch (seq[1]) {
                        case 'A': return KEY_UP;
                        case 'B': return KEY_DOWN;
                        case 'C': return KEY_RIGHT;
                        case 'D': return KEY_LEFT;
                        default:  return KEY_ESC;
                    }
                }
            }
        }
        return KEY_ESC;
    }

    return key;
}
