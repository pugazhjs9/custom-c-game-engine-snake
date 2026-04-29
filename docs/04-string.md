# 04 — Custom Strings

> **In one sentence:** We re-implement the basics of `<string.h>` ourselves — `str_len`, `str_copy`, `str_compare`, plus integer ↔ string conversion — so we never `#include <string.h>`.

---

## Refresher: what is a "string" in C?

There is **no string type**. A "string" is a `char *` pointing to the first character, and the **end** is marked by a special zero byte called the **null terminator** `'\0'` (which is just the integer `0`).

```
"Hi!"  in memory:
    ┌───┬───┬───┬─────┐
    │ H │ i │ ! │ \0  │
    └───┴───┴───┴─────┘
     ↑
   the pointer points here
```

Every function below either **walks until it sees `\0`** or **writes a `\0`** when it's done. That's the whole game.

---

## The functions

```c
int  str_len(const char *s);
void str_copy(char *dest, const char *src);
int  str_compare(const char *a, const char *b);
void str_concat(char *dest, const char *a, const char *b);
int  str_split(char *str, char delim, char tokens[][50], int max);
void int_to_str(int value, char *buf, int buf_size);
int  str_to_int(const char *s);
```

---

## `str_len` — count until you see zero

```c
int str_len(const char *s) {
    int len = 0;
    if (!s) return 0;
    while (s[len] != '\0') len++;
    return len;
}
```

That's literally the whole thing. Walk forward until you find the zero byte. Time complexity: O(n). This is why **`strlen` is not free in C** — every time you call it, the string is re-walked.

---

## `str_copy` — like `dest = src`, but byte by byte

```c
void str_copy(char *dest, const char *src) {
    if (!dest || !src) return;
    while (*src) {              // while the byte we're pointing at isn't \0
        *dest++ = *src++;       // copy it, advance both pointers
    }
    *dest = '\0';               // don't forget the null!
}
```

`*dest++ = *src++` reads as: "write what `src` points to into where `dest` points, then advance both pointers." It's a four-thing one-liner. Beautiful, dense, dangerous if `dest` is too small.

---

## `str_compare` — like Python's `==`

```c
int str_compare(const char *a, const char *b) {
    while (*a && (*a == *b)) { a++; b++; }
    return *(const unsigned char*)a - *(const unsigned char*)b;
}
```

Walk both strings in lockstep until either ends or they diverge. Return the **difference** of the first non-matching bytes:
- `0` → strings are equal
- negative → `a` is "less than" `b` (alphabetically earlier)
- positive → `a` > `b`

The cast to `unsigned char *` ensures the subtraction works correctly for high-byte chars (UTF-8, etc.).

---

## `int_to_str` — the trickiest one

Converting an integer to a printable string is **two passes** because we extract digits in **reverse**.

```c
void int_to_str(int value, char *buf, int buf_size) {
    int i = 0, j;
    int is_negative = 0;
    char temp;
    int midpoint;

    if (value == 0) { buf[0] = '0'; buf[1] = '\0'; return; }

    if (value < 0) { is_negative = 1; value = -value; }

    // (1) extract digits in REVERSE
    while (value > 0 && i < buf_size - 1) {
        buf[i++] = (char)(math_mod(value, 10) + '0');   // last digit → ASCII
        value    = math_div(value, 10);                 // chop it off
    }

    if (is_negative && i < buf_size - 1) buf[i++] = '-';

    buf[i] = '\0';

    // (2) reverse the buffer in place
    midpoint = math_div(i, 2);
    for (j = 0; j < midpoint; j++) {
        temp = buf[j];
        buf[j] = buf[i - 1 - j];
        buf[i - 1 - j] = temp;
    }
}
```

### Walked through with `value = 423`

| Step | `value` | `buf` so far |
|---|---|---|
| start | 423 | `""` |
| `423 % 10 = 3`, append `'3'`, then `423/10=42` | 42 | `"3"` |
| `42 % 10 = 2`, append `'2'`, then `42/10=4` | 4 | `"32"` |
| `4 % 10 = 4`, append `'4'`, then `4/10=0` | 0 | `"324"` |
| Add `'\0'` | — | `"324\0"` |
| **Reverse** | — | `"423\0"` ✅ |

The `+ '0'` trick converts a digit (0–9) to its ASCII character ('0'=48, '9'=57). Pure bit-banging.

---

## `str_to_int` — the reverse

```c
int str_to_int(const char *s) {
    int value = 0, negative = 0, i = 0;

    while (s[i]==' '||s[i]=='\t'||s[i]=='\n'||s[i]=='\r') i++;  // skip whitespace
    if (s[i] == '-') { negative = 1; i++; }
    else if (s[i] == '+') { i++; }

    while (s[i] >= '0' && s[i] <= '9') {
        value = math_mul(value, 10) + (s[i] - '0');             // shift left, add digit
        i++;
    }
    return negative ? -value : value;
}
```

Standard left-to-right parse. `value = value * 10 + digit` shifts decimal places. `(s[i] - '0')` reverses the trick from `int_to_str`: ASCII char → digit.

This pair of functions (`int_to_str` + `str_to_int`) is **how we save and load high scores** — see [`07-score.md`](07-score.md). The integer 423 becomes the bytes `'4', '2', '3'` on disk.

---

## `str_split` — minimal tokenizer

```c
int str_split(char *str, char delim, char tokens[][50], int max_tokens) {
    int token_count = 0, char_idx = 0;
    while (*str && token_count < max_tokens) {
        if (*str == delim) {
            tokens[token_count][char_idx] = '\0';
            token_count++;
            char_idx = 0;
        } else if (char_idx < 49) {
            tokens[token_count][char_idx++] = *str;
        }
        str++;
    }
    if (token_count < max_tokens) {
        tokens[token_count][char_idx] = '\0';
        token_count++;
    }
    return token_count;
}
```

Splits `"a,b,c"` into `["a", "b", "c"]` if `delim = ','`. Each token gets its own row in the 2D array. The `49` cap leaves room for the `\0` in each 50-char slot. (We don't actually use this in the snake game, but it's there for completeness.)

---

## Where these are used

- `int_to_str` — score numbers in the HUD, save files
- `str_to_int` — load saved scores
- `str_len` — center text horizontally in menus / HUD
- `str_concat` — build save-file path: `".snake_highscore_" + "normal"`

---

## 📢 Presentation Script — "Strings"

> "C has no string type. A string is just a pointer to characters, ending in a zero byte. Want the length? You walk it. Want to copy it? You walk both pointers in lockstep. So we wrote our own utilities.
>
> The most interesting one is `int_to_str` — converting a number like 423 into the characters `'4', '2', '3'`. The trick is **digits come out in reverse**: `423 % 10 = 3`, then `42 % 10 = 2`, then `4 % 10 = 4`. So we extract `"324"` first, then **reverse it in place** with a swap loop. Plus the classic `+ '0'` trick to turn a digit into its ASCII character.
>
> Why does this matter? Because that's how we **persist high scores**. We `int_to_str` the score, write it as bytes to a file, and on load we `str_to_int` the bytes back into a number. No `printf`, no `fprintf` — pure byte manipulation."

---

✅ Next: [`05-screen.md`](05-screen.md) — drawing in the terminal.
