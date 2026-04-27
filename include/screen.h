#ifndef SCREEN_H
#define SCREEN_H

/* ── Terminal rendering via ANSI escape codes ── */

void screen_init(int width, int height);           /* save terminal state, hide cursor     */
void screen_cleanup(void);                         /* restore terminal state, show cursor   */
void screen_clear(void);                           /* clear entire screen                   */
void screen_move_cursor(int x, int y);             /* move cursor to (x, y)  1-based       */
void screen_put_char(int x, int y, char c);        /* draw single char at (x, y)           */
void screen_put_utf8(int x, int y, const char *s); /* draw UTF-8 string at (x, y)          */
void screen_put_str(int x, int y, const char *s);  /* draw string starting at (x, y)       */
void screen_set_color(int fg, int bg);             /* set foreground / background colors    */
void screen_set_color_256(int fg, int bg);         /* set 256-color fg / bg (-1 = skip)     */
void screen_set_color_rgb(int r, int g, int b, int is_bg); /* set RGB fg or bg color       */
void screen_reset_color(void);                     /* reset to default colors               */
void screen_erase_line(int y);                     /* erase entire line at row y             */
void screen_draw_border(int w, int h);             /* draw box border of w×h                */
void screen_flush(void);                           /* flush stdout                          */
void screen_get_terminal_size(int *cols, int *rows); /* query actual terminal dimensions    */

#endif /* SCREEN_H */
