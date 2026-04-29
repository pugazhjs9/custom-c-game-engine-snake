#ifndef SCORE_H
#define SCORE_H

/* ── Persistent high-score storage (custom POSIX I/O, no <stdio.h>) ──
 *
 * Each game mode keeps its own high-score file under the working directory:
 *   .snake_highscore_<mode_tag>
 *
 * Files are written via open()/write()/close() and parsed with our own
 * integer conversion utilities — no use of fopen / fprintf / scanf.
 */

int  score_load(const char *mode_tag);              /* returns 0 if no file / parse error */
void score_save(const char *mode_tag, int score);   /* truncate-and-write integer as ASCII */

#endif /* SCORE_H */
