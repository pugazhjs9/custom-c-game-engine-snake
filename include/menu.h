#ifndef MENU_H
#define MENU_H

#include "game.h"

/* ── Main menu & difficulty selection ── */

typedef struct {
    GameMode    mode;
    Difficulty  difficulty;
    int         quit;        /* 1 if user chose Quit, 0 otherwise */
} MenuResult;

MenuResult menu_run(int board_w, int board_h);

#endif /* MENU_H */
