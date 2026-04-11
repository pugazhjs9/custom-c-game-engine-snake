#include "../include/screen.h"
#include <stdio.h>

/*
 * screen.c — Terminal rendering via ANSI escape codes
 *
 * Uses printf / putchar with ANSI CSI sequences for:
 *   - cursor positioning
 *   - foreground / background colors
 *   - screen clearing
 *   - border drawing
 *
 * TODO: implement
 */

/* ANSI Escape Sequences */
#define ESC "\x1b"
#define CSI ESC "["

static int s_width;
static int s_height;

void screen_init(int width, int height) {
    s_width  = width;
    s_height = height;

    /* Fully buffer stdout — entire frame renders atomically on fflush */
    setvbuf(stdout, (char *)0, _IOFBF, 8192);

    /* Use alternate screen buffer to leave terminal history untouched */
    printf(CSI "?1049h");
    /* Hide cursor */
    printf(CSI "?25l");
    
    /* Full clear on first entry (alt buffer may have garbage) */
    printf(CSI "2J");
    printf(CSI "H");
    fflush(stdout);
}

void screen_cleanup(void) {
    /* Show cursor */
    printf(CSI "?25h");
    /* Restore main screen buffer */
    printf(CSI "?1049l");
    screen_reset_color();
    fflush(stdout);
}

void screen_clear(void) {
    /* Move cursor to home position instead of clearing —
       overdrawing prevents flicker */
    printf(CSI "H");
}

void screen_move_cursor(int x, int y) {
    /* ANSI cursor positioning is 1-based: CSI y ; x H */
    printf(CSI "%d;%dH", y + 1, x + 1);
}

void screen_put_char(int x, int y, char c) {
    screen_move_cursor(x, y);
    putchar(c);
}

void screen_put_str(int x, int y, const char *s) {
    screen_move_cursor(x, y);
    if (s) {
        printf("%s", s);
    }
}

void screen_set_color(int fg, int bg) {
    /* Basic 16-color ANSI codes (e.g. 32=green fg, 44=blue bg) */
    printf(CSI "%d;%dm", fg, bg);
}

void screen_reset_color(void) {
    printf(CSI "0m");
}

void screen_draw_border(int w, int h) {
    int i;
    char row[81];  /* max width supported */

    if (w > 80) w = 80;

    /* build a full row of '#' */
    for (i = 0; i < w; i++) {
        row[i] = '#';
    }
    row[w] = '\0';

    /* top row */
    screen_put_str(0, 0, row);
    /* bottom row */
    screen_put_str(0, h - 1, row);

    /* left and right columns */
    for (i = 1; i < h - 1; i++) {
        screen_put_char(0, i, '#');
        screen_put_char(w - 1, i, '#');
    }
}

void screen_flush(void) {
    fflush(stdout);
}
