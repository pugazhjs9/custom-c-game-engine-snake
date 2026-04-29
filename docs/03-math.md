# 03 — Math Helpers (and a PRNG from scratch)

> **In one sentence:** A handful of integer math utilities (`abs`, `min`, `max`, `clamp`, `mod`) plus a **Linear Congruential Generator** that gives us pseudo-random numbers without `<stdlib.h>`'s `rand()`.

---

## What's in here?

```c
int  math_abs(int x);                   // |x|
int  math_mul(int a, int b);            // a * b   (wrapper for clarity)
int  math_div(int a, int b);            // a / b   (with /0 protection)
int  math_mod(int a, int b);            // a % b   (with /0 protection)
int  math_min(int a, int b);            // smaller
int  math_max(int a, int b);            // larger
int  math_clamp(int x, int lo, int hi); // restrict x to [lo, hi]
int  is_out_of_bounds(int x, int y, int width, int height);

int  math_rand(int lo, int hi);         // random int in [lo, hi]
void math_seed(unsigned int seed);      // initialize PRNG
```

---

## Why does this exist?

Two reasons:

1. **`<math.h>` is overkill.** It's for `sin`, `cos`, `sqrt`, `pow` — we don't need any of that for a grid game.
2. **Wrap raw `*`, `/`, `%` in functions.** A stylistic choice in this codebase: `math_mul(a, 10)` reads more like prose and keeps a single place to add overflow checks if we ever wanted them.

---

## The simple ones

```c
int math_abs(int x)            { return (x < 0) ? -x : x; }
int math_min(int a, int b)     { return (a < b) ? a : b; }
int math_max(int a, int b)     { return (a > b) ? a : b; }
int math_clamp(int x,int lo,int hi){
    if (x < lo) return lo;
    if (x > hi) return hi;
    return x;
}
```

`?:` is the **ternary operator** — `cond ? a : b` is exactly Python's `a if cond else b`.

`math_clamp` is everywhere in this codebase: **"I want this value, but force it into a valid range."** Example from `main.c`:
```c
game->board_w = math_clamp(tc, 25, 200);
```
→ "Use the terminal width, but never go below 25 or above 200."

### `is_out_of_bounds`

```c
int is_out_of_bounds(int x, int y, int width, int height) {
    return (x < 0 || x >= width || y < 0 || y >= height);
}
```
Returns 1 (true) if the point is outside the rectangle `[0, width) × [0, height)`. Used as a guard before we draw or move.

### Division-by-zero guard

```c
int math_div(int a, int b) {
    if (b == 0) return 0;
    return a / b;
}
```
In C, `a / 0` would crash with a hardware exception. We return 0 instead — a defensive default. Same for `math_mod`.

---

## The interesting one: `math_rand` (an LCG)

We need random numbers for spawning food. C's standard `rand()` from `<stdlib.h>` is banned, so we implement a **Linear Congruential Generator** — the simplest pseudo-random number algorithm in existence.

### The formula

```
next = (current * a + c) mod m
```

We use the classic POSIX parameters:
```
a = 1,103,515,245
c = 12,345
m = 2^31  →  applied as `& 0x7fffffff`  (bit-mask to 31 bits)
```

### Code

```c
static unsigned int g_seed = 1;     // global state

void math_seed(unsigned int seed) {
    if (seed == 0) seed = 1;        // seed 0 collapses to all-zeros — avoid
    g_seed = seed;
}

int math_rand(int lo, int hi) {
    int range;

    g_seed = (g_seed * 1103515245 + 12345) & 0x7fffffff;   // (1) advance state

    if (lo > hi) { int t = lo; lo = hi; hi = t; }          // (2) swap if reversed

    range = hi - lo + 1;
    if (range <= 0) return lo;

    return lo + (int)(g_seed % range);                     // (3) map to [lo, hi]
}
```

(1) The state evolves like a chaotic but deterministic dance: each call multiplies by a huge number, adds a small one, and chops to 31 bits. The output looks random but is fully reproducible if you reseed.

(2) Defensive: if someone calls `math_rand(10, 5)`, we swap so the math works.

(3) `g_seed % range` gives a value in `[0, range)`, then we shift it up by `lo`.

### Why we seed with `time()`

In `main.c`:
```c
math_seed((unsigned int)time((time_t *)0));
```
At startup, `time(NULL)` returns seconds-since-1970. A different value every second → different food positions every run. Without seeding, every run would start with the **exact same** sequence of "random" numbers (because `g_seed` defaults to 1).

### Diagram of the LCG

```
g_seed = 1
   │
   │ × 1,103,515,245
   │ + 12,345
   │ & 0x7fffffff      ← keeps only the low 31 bits
   ▼
g_seed = 1,103,527,590
   │
   │ same dance
   ▼
g_seed = 377,401,575
   │ ...

each step, take % range to map into your bucket.
```

### Caveats of LCG

- Not cryptographically secure (do **not** use for passwords).
- Has known statistical weaknesses (low bits cycle).
- For a snake game where the worst that happens is "predictable food position with the same seed," it's perfect.

---

## Where these are used

| Use site | Function | Why |
|---|---|---|
| Snake board sizing | `math_clamp` | Stay between min and max board sizes |
| Coordinate bounds check | `is_out_of_bounds` | Wall collision |
| Center calculations | `math_div(w, 2)` | Find the middle of the screen |
| Food respawn | `math_rand(1, board_w - 2)` | Random cell inside borders |
| AI distance | `math_abs` | Manhattan distance heuristics |
| Tick-rate calculation | `math_max(...)`, `math_min(...)` | Speed clamping |

---

## 📢 Presentation Script — "Math"

> "We didn't want `<math.h>` — that's for sines and cosines we don't need. So this module has two halves.
>
> The **boring half** is small wrappers: `min`, `max`, `clamp`, `abs`. The most important one is `clamp`, which forces a value into a range. We use it everywhere — terminal sizes, snake positions, tick speeds.
>
> The **interesting half** is `math_rand`. We implement the simplest pseudo-random algorithm in computer science: a **Linear Congruential Generator**. Each call updates a running 'seed' by `seed = (seed * 1103515245 + 12345) & 0x7fffffff`, then we take that modulo our range. Looks random, but if you re-seed with the same value you get the same sequence. That's why at startup we seed with the current time — different second, different game.
>
> The whole file is 75 lines."

---

✅ Next: [`04-string.md`](04-string.md) — strings without `<string.h>`.
