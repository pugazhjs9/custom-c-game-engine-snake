#include "../include/menu.h"
#include "../include/keyboard.h"
#include "../include/screen.h"
#include "../include/string.h"
#include "../include/math.h"
#include <unistd.h>

/*
 * menu.c — Main menu and difficulty selection
 *
 * Two screens, navigated with W/S or Up/Down, confirmed with Enter or D /
 * Right Arrow.
 *
 *   Screen 1: Mode  -> Single Player | AI Auto-play | 2 Player | Quit
 *   Screen 2: Diff. -> Easy | Normal | Hard | Back
 *
 * Each redraw is buffered and flushed atomically (no flicker).
 */

#define CLR_TITLE     39
#define CLR_HEADING   220
#define CLR_ITEM      252
#define CLR_SELECTED  46
#define CLR_HINT      245
#define CLR_BORDER    33
#define CLR_ACCENT    214

static const char *MODE_ITEMS[] = {
    "Single Player",
    "AI Auto-play",
    "2 Player Local",
    "Quit"
};
static const int MODE_COUNT = 4;

static const char *DIFF_ITEMS[] = {
    "Easy",
    "Normal",
    "Hard",
    "Back"
};
static const int DIFF_COUNT = 4;

static const char *MODE_HINTS[] = {
    "One snake. WASD or Arrow keys.",
    "Watch the AI find food via BFS.",
    "Player 1 uses WASD. Player 2 uses Arrow keys.",
    "Exit the game."
};

static const char *DIFF_HINTS[] = {
    "Slower pace. Great for learning.",
    "Standard speed. The classic experience.",
    "Fast and unforgiving. Reflexes only.",
    "Return to the previous menu."
};

static void draw_centered(int y, int board_w, int color, const char *text) {
    int x = math_div(board_w, 2) - math_div(str_len(text), 2);
    if (x < 1) x = 1;
    screen_set_color_256(color, -1);
    screen_put_str(x, y, text);
    screen_reset_color();
}

static void draw_frame(int board_w, int board_h, const char *title) {
    int i;
    screen_clear();
    screen_set_color_256(CLR_BORDER, -1);
    screen_draw_border(board_w, board_h);
    screen_reset_color();

    /* Title bar */
    draw_centered(2, board_w, CLR_TITLE, title);

    /* ASCII snake decoration */
    screen_set_color_256(CLR_ACCENT, -1);
    for (i = 0; i < 3; i++) {
        int gx = math_div(board_w, 2) - 12 + (i * 12);
        if (gx > 0 && gx < board_w - 1) {
            screen_put_utf8(gx, 4, "\xe2\x97\x86"); /* ◆ */
        }
    }
    screen_reset_color();
}

static void draw_menu_items(const char **items, int count, int selected,
                            int board_w, int top_y, const char **hints) {
    int i;
    int item_w = 32;
    int x = math_div(board_w, 2) - math_div(item_w, 2);
    if (x < 2) x = 2;

    for (i = 0; i < count; i++) {
        int y = top_y + (i * 2);
        int color = (i == selected) ? CLR_SELECTED : CLR_ITEM;
        char line[80];
        int j;
        /* clear line area */
        for (j = 0; j < item_w; j++) line[j] = ' ';
        line[item_w] = '\0';
        screen_put_str(x, y, line);

        screen_set_color_256(color, -1);
        if (i == selected) {
            screen_put_utf8(x + 2, y, "\xe2\x96\xb6"); /* ▶ */
        }
        screen_put_str(x + 5, y, items[i]);
        screen_reset_color();
    }

    /* Hint line under the items */
    if (hints) {
        int hint_y = top_y + (count * 2) + 2;
        int j;
        char clr[80];
        for (j = 0; j < 78; j++) clr[j] = ' ';
        clr[78] = '\0';
        screen_put_str(1, hint_y, clr);
        draw_centered(hint_y, board_w, CLR_HINT, hints[selected]);
    }
}

static void draw_footer(int board_w, int board_h) {
    const char *help = "W/S or Up/Down: navigate    Enter / D: select    Q: quit";
    draw_centered(board_h - 2, board_w, CLR_HINT, help);
}

static int select_from_list(const char **items, int count,
                            const char **hints, const char *title,
                            int board_w, int board_h) {
    int selected = 0;
    int top_y = math_div(board_h, 2) - count;
    if (top_y < 6) top_y = 6;

    draw_frame(board_w, board_h, title);
    draw_menu_items(items, count, selected, board_w, top_y, hints);
    draw_footer(board_w, board_h);
    screen_flush();

    while (1) {
        if (keyPressed()) {
            int k = readKey();
            int prev = selected;
            if (k == 'q' || k == 'Q') return -1;
            else if (k == 'w' || k == 'W' || k == KEY_UP) {
                selected--;
                if (selected < 0) selected = count - 1;
            } else if (k == 's' || k == 'S' || k == KEY_DOWN) {
                selected++;
                if (selected >= count) selected = 0;
            } else if (k == KEY_ENTER || k == KEY_CR ||
                       k == 'd' || k == 'D' || k == KEY_RIGHT || k == ' ') {
                return selected;
            }
            if (selected != prev) {
                draw_menu_items(items, count, selected, board_w, top_y, hints);
                screen_flush();
            }
        } else {
            usleep(10000);
        }
    }
}

MenuResult menu_run(int board_w, int board_h) {
    MenuResult res;
    res.mode = MODE_SINGLE;
    res.difficulty = DIFF_NORMAL;
    res.quit = 0;

    while (1) {
        int mode_idx = select_from_list(MODE_ITEMS, MODE_COUNT, MODE_HINTS,
                                        "S N A K E   —   M A I N   M E N U",
                                        board_w, board_h);
        if (mode_idx < 0 || mode_idx == 3) {
            res.quit = 1;
            return res;
        }

        if (mode_idx == 0) res.mode = MODE_SINGLE;
        else if (mode_idx == 1) res.mode = MODE_AI;
        else res.mode = MODE_MULTI;

        /* difficulty */
        int diff_idx = select_from_list(DIFF_ITEMS, DIFF_COUNT, DIFF_HINTS,
                                        "S E L E C T   D I F F I C U L T Y",
                                        board_w, board_h);
        if (diff_idx < 0) { res.quit = 1; return res; }
        if (diff_idx == 3) continue; /* Back to mode menu */

        if (diff_idx == 0) res.difficulty = DIFF_EASY;
        else if (diff_idx == 1) res.difficulty = DIFF_NORMAL;
        else res.difficulty = DIFF_HARD;

        return res;
    }
}
