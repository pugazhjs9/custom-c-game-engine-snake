#ifndef STRING_H
#define STRING_H

/* ── Custom string utilities (no <string.h>) ── */

int    str_len(const char *s);                                  /* length of s               */
void   str_copy(char *dest, const char *src);                   /* copy src → dest           */
int    str_compare(const char *a, const char *b);               /* 0 if equal                */
void   str_concat(char *dest, const char *a, const char *b);    /* dest = a + b              */
int    str_split(char *str, char delimiter, char tokens[][50], int max_tokens);  /* split */
void   int_to_str(int value, char *buf, int buf_size);          /* integer → decimal string  */
int    str_to_int(const char *s);                               /* decimal string → integer  */

#endif /* STRING_H */
