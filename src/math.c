#include "../include/math.h"

/*
 * math.c — Lightweight math helpers
 *
 * Pure integer arithmetic, clamping, bounds-checking,
 * and a linear congruential PRNG.
 * No dependency on <math.h>.
 *
 * TODO: implement
 */

static unsigned int g_seed = 1;

int math_abs(int x) {
    return (x < 0) ? -x : x;
}

int math_mul(int a, int b) {
    return a * b;
}

int math_div(int a, int b) {
    if (b == 0) return 0; /* basic error handling to avoid crash */
    return a / b;
}

int math_mod(int a, int b) {
    if (b == 0) return 0;
    return a % b;
}

int math_min(int a, int b) {
    return (a < b) ? a : b;
}

int math_max(int a, int b) {
    return (a > b) ? a : b;
}

int math_clamp(int x, int lo, int hi) {
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}

int is_out_of_bounds(int x, int y, int width, int height) {
    return (x < 0 || x >= width || y < 0 || y >= height);
}

void math_seed(unsigned int seed) {
    /* prevent a seed of 0 which breaks simple LCG */
    if (seed == 0) {
        seed = 1;
    }
    g_seed = seed;
}

int math_rand(int lo, int hi) {
    int range;
    
    /* standard POSIX LCG parameters */
    g_seed = (g_seed * 1103515245 + 12345) & 0x7fffffff;
    
    if (lo > hi) {
        int temp = lo;
        lo = hi;
        hi = temp;
    }
    
    range = hi - lo + 1;
    if (range <= 0) return lo;
    
    return lo + (int)(g_seed % range);
}
