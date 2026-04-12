#ifndef KEYBOARD_H
#define KEYBOARD_H

/* ── Non-blocking keyboard input (termios raw mode) ── */

void kb_init(void);        /* switch terminal to raw / non-blocking mode */
void kb_cleanup(void);     /* restore original terminal settings         */
int  keyPressed(void);     /* 1 if a key is available, 0 otherwise       */
char readKey(void);        /* read and return the pressed key character   */

#endif /* KEYBOARD_H */
