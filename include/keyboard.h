#ifndef KEYBOARD_H
#define KEYBOARD_H

/* ── Non-blocking keyboard input (termios raw mode) ── */

/* Special key codes (outside ASCII printable range) so callers can
 * distinguish arrow keys from WASD — required for 2-player mode. */
#define KEY_NONE   0
#define KEY_UP     128
#define KEY_DOWN   129
#define KEY_LEFT   130
#define KEY_RIGHT  131
#define KEY_ENTER  10    /* '\n' */
#define KEY_CR     13    /* '\r' — many terminals send CR for Return */
#define KEY_ESC    27

void kb_init(void);        /* switch terminal to raw / non-blocking mode */
void kb_cleanup(void);     /* restore original terminal settings         */
int  keyPressed(void);     /* 1 if a key is available, 0 otherwise       */
int  readKey(void);        /* returns key code (KEY_* or ASCII)          */

#endif /* KEYBOARD_H */
