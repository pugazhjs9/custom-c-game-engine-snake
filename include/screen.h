#ifndef SCREEN_H
#define SCREEN_H

/* ── Terminal rendering via ANSI escape codes ── */

void screen_init(int width, int height);           /* save terminal state, hide cursor     */
void screen_cleanup(void);                         /* restore terminal state, show cursor   */
void screen_clear(void);                           /* clear entire screen                   */
void screen_move_cursor(int x, int y);             /* move cursor to (x, y)  1-based       */
void screen_put_char(int x, int y, char c);        /* draw single char at (x, y)           */
void screen_put_str(int x, int y, const char *s);  /* draw string starting at (x, y)       */
void screen_set_color(int fg, int bg);             /* set foreground / background colors    */
void screen_reset_color(void);                     /* reset to default colors               */
void screen_draw_border(int w, int h);             /* draw box border of w×h                */
void screen_flush(void);                           /* flush stdout                          */

#endif /* SCREEN_H */
