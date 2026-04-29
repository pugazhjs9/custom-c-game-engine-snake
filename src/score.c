#include "../include/score.h"
#include "../include/string.h"
#include <unistd.h>
#include <fcntl.h>

/*
 * score.c — Persistent high-score storage with custom POSIX I/O
 *
 * No <stdio.h> is used here. open()/read()/write()/close() come from
 * <unistd.h>/<fcntl.h>. Integers are serialised as plain decimal ASCII
 * via our own int_to_str / str_to_int helpers.
 *
 * Files live in the working directory and are named:
 *   .snake_highscore_<mode_tag>
 * for example .snake_highscore_normal, .snake_highscore_ai, etc.
 */

#define PATH_PREFIX ".snake_highscore_"
#define MAX_PATH    64

/* Custom mini path builder so we don't pull in stdio. */
static void build_path(char *out, const char *mode_tag) {
    str_concat(out, PATH_PREFIX, mode_tag ? mode_tag : "default");
}

int score_load(const char *mode_tag) {
    char path[MAX_PATH];
    char buf[32];
    int  fd;
    int  n;

    build_path(path, mode_tag);

    fd = open(path, O_RDONLY);
    if (fd < 0) {
        return 0;
    }

    n = (int)read(fd, buf, (int)sizeof(buf) - 1);
    close(fd);

    if (n <= 0) {
        return 0;
    }

    buf[n] = '\0';
    return str_to_int(buf);
}

void score_save(const char *mode_tag, int score) {
    char path[MAX_PATH];
    char buf[32];
    int  fd;
    int  len;

    if (score < 0) score = 0;

    build_path(path, mode_tag);
    int_to_str(score, buf, (int)sizeof(buf));
    len = str_len(buf);

    fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) {
        return;
    }

    write(fd, buf, (unsigned)len);
    close(fd);
}
