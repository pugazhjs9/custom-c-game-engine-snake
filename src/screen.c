#include "../include/screen.h"
#include <stdio.h>
#include <sys/ioctl.h>
#include <unistd.h>

/*
 * screen.c — Terminal rendering via ANSI escape codes
 */

#define ESC "\x1b"
#define CSI ESC "["

static int s_width;
static int s_height;

void screen_get_terminal_size(int *cols, int *rows) {
  struct winsize ws;
  if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws) == 0) {
    *cols = ws.ws_col;
    *rows = ws.ws_row;
  } else {
    *cols = 80;
    *rows = 24;
  }
}

void screen_init(int width, int height) {
  s_width = width;
  s_height = height;

  /* Large buffer — entire frame renders atomically on fflush */
  setvbuf(stdout, (char *)0, _IOFBF, 65536);

  printf(CSI "?1049h"); /* alternate screen buffer */
  printf(CSI "?25l");   /* hide cursor */
  printf(CSI "2J");     /* full clear */
  printf(CSI "H");      /* cursor home */
  fflush(stdout);
}

void screen_cleanup(void) {
  printf(CSI "?25h");   /* show cursor */
  printf(CSI "?1049l"); /* restore main buffer */
  screen_reset_color();
  fflush(stdout);
}

void screen_clear(void) {
  int cols, rows, i;
  screen_get_terminal_size(&cols, &rows);
  /* Use 2K (erase line) for each row to avoid 2J whole-screen flicker on MacOS
   */
  for (i = 0; i < rows; i++) {
    screen_move_cursor(0, i);
    printf(CSI "2K");
  }
  printf(CSI "H");
}

void screen_move_cursor(int x, int y) { printf(CSI "%d;%dH", y + 1, x + 1); }

void screen_put_char(int x, int y, char c) {
  screen_move_cursor(x, y);
  putchar(c);
}

void screen_put_utf8(int x, int y, const char *s) {
  screen_move_cursor(x, y);
  if (s)
    printf("%s", s);
}

void screen_put_str(int x, int y, const char *s) {
  screen_move_cursor(x, y);
  if (s)
    printf("%s", s);
}

void screen_set_color(int fg, int bg) { printf(CSI "%d;%dm", fg, bg); }

void screen_set_color_256(int fg, int bg) {
  if (fg >= 0)
    printf(CSI "38;5;%dm", fg);
  if (bg >= 0)
    printf(CSI "48;5;%dm", bg);
}

void screen_set_color_rgb(int r, int g, int b, int is_bg) {
  if (is_bg)
    printf(CSI "48;2;%d;%d;%dm", r, g, b);
  else
    printf(CSI "38;2;%d;%d;%dm", r, g, b);
}

void screen_reset_color(void) { printf(CSI "0m"); }

void screen_erase_line(int y) {
  screen_move_cursor(0, y);
  printf(CSI "2K"); /* erase entire line */
}

void screen_draw_border(int w, int h) {
  int i;

  /* Top border */
  screen_move_cursor(0, 0);
  printf("\xe2\x95\x94"); /* ╔ */
  for (i = 1; i < w - 1; i++)
    printf("\xe2\x95\x90"); /* ═ */
  printf("\xe2\x95\x97");   /* ╗ */

  /* Bottom border */
  screen_move_cursor(0, h - 1);
  printf("\xe2\x95\x9a"); /* ╚ */
  for (i = 1; i < w - 1; i++)
    printf("\xe2\x95\x90"); /* ═ */
  printf("\xe2\x95\x9d");   /* ╝ */

  /* Side borders */
  for (i = 1; i < h - 1; i++) {
    screen_move_cursor(0, i);
    printf("\xe2\x95\x91"); /* ║ */
    screen_move_cursor(w - 1, i);
    printf("\xe2\x95\x91"); /* ║ */
  }
}

void screen_flush(void) { fflush(stdout); }
