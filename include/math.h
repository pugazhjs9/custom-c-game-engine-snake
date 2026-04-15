#ifndef MATH_H
#define MATH_H

/* ── Lightweight math helpers (no <math.h>) ── */

int  math_abs(int x);                                      /* absolute value                   */
int  math_mul(int a, int b);                               /* multiply two ints                */
int  math_div(int a, int b);                               /* integer division                 */
int  math_mod(int a, int b);                               /* modulus (remainder)               */

int  math_min(int a, int b);                               /* minimum of two ints              */
int  math_max(int a, int b);                               /* maximum of two ints              */
int  math_clamp(int x, int lo, int hi);                    /* clamp x to [lo, hi]              */

int  is_out_of_bounds(int x, int y, int width, int height); /* 1 if (x,y) outside bounds       */

int  math_rand(int lo, int hi);                            /* pseudo-random int in [lo, hi]    */
void math_seed(unsigned int seed);                         /* seed the PRNG                    */

#endif /* MATH_H */
