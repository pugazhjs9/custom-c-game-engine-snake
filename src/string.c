#include "../include/string.h"
#include "../include/math.h"

/*
 * string.c — Custom string utilities
 *
 * All functions operate on null-terminated char arrays.
 * No dependency on <string.h>.
 *
 * TODO: implement
 */

int str_len(const char *s) {
    int len = 0;
    if (!s) return 0;
    while (s[len] != '\0') {
        len++;
    }
    return len;
}

void str_copy(char *dest, const char *src) {
    if (!dest || !src) return;
    while (*src) {
        *dest++ = *src++;
    }
    *dest = '\0';
}

int str_compare(const char *a, const char *b) {
    if (!a || !b) return (a == b) ? 0 : (a ? 1 : -1);
    while (*a && (*a == *b)) {
        a++;
        b++;
    }
    return *(const unsigned char*)a - *(const unsigned char*)b;
}

void str_concat(char *dest, const char *a, const char *b) {
    if (!dest) return;
    if (a) {
        while (*a) {
            *dest++ = *a++;
        }
    }
    if (b) {
        while (*b) {
            *dest++ = *b++;
        }
    }
    *dest = '\0';
}

int str_split(char *str, char delimiter, char tokens[][50], int max_tokens) {
    int token_count = 0;
    int char_idx = 0;

    if (!str || !tokens || max_tokens <= 0) return 0;

    while (*str && token_count < max_tokens) {
        if (*str == delimiter) {
            tokens[token_count][char_idx] = '\0';
            token_count++;
            char_idx = 0;
        } else {
            if (char_idx < 49) { /* leave room for null terminator */
                tokens[token_count][char_idx++] = *str;
            }
        }
        str++;
    }

    if (token_count < max_tokens) {
        tokens[token_count][char_idx] = '\0';
        token_count++;
    }

    return token_count;
}

void int_to_str(int value, char *buf, int buf_size) {
    int i = 0, j = 0;
    int is_negative = 0;
    char temp;

    if (!buf || buf_size <= 0) return;

    if (value == 0) {
        if (buf_size > 1) {
            buf[0] = '0';
            buf[1] = '\0';
        }
        return;
    }

    if (value < 0) {
        is_negative = 1;
        value = -value;
    }

    /* extract digits in reverse using standard operators */
    while (value > 0 && i < buf_size - 1) {
        buf[i++] = (char)((value % 10) + '0');  /* digit = value % 10 */
        value    = value / 10;                  /* value /= 10        */
    }

    if (is_negative && i < buf_size - 1) {
        buf[i++] = '-';
    }

    buf[i] = '\0';

    /* reverse the string */
    for (j = 0; j < i / 2; j++) {  /* midpoint = i / 2 */
        temp = buf[j];
        buf[j] = buf[i - 1 - j];
        buf[i - 1 - j] = temp;
    }
}
