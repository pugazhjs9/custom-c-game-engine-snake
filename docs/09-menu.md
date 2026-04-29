# 09 — Menu: Two-Screen Selector

> **In one sentence:** A simple state machine that draws a list of options, lets you navigate with W/S or arrow keys, and returns your choice — first for **mode**, then for **difficulty**.

---

## What does the menu do?

Two screens, in sequence:

```
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│   S N A K E — MAIN MENU          │         │   SELECT DIFFICULTY              │
│                                  │         │                                  │
│       ▶  Single Player           │   →     │       ▶  Easy                    │
│          AI Auto-play            │         │          Normal                  │
│          2 Player Local          │         │          Hard                    │
│          Quit                    │         │          Back                    │
│                                  │         │                                  │
│   "One snake. WASD or arrows."   │         │   "Slower pace. Great for..."    │
│                                  │         │                                  │
│   W/S Up/Down navigate  Enter    │         │   W/S Up/Down navigate  Enter    │
└──────────────────────────────────┘         └──────────────────────────────────┘
```

User picks `Single Player` → goes to difficulty screen → picks `Hard` → returns to main and starts the game.

The result is a tiny struct:
```c
typedef struct {
    GameMode   mode;
    Difficulty difficulty;
    int        quit;
} MenuResult;
```

---

## Why have a menu module at all?

Decoupling. The main loop doesn't care **how** the player chooses; it just calls `menu_run(...)` and gets a struct back. We could change the menu to be mouse-driven or graphical and the rest of the game wouldn't notice.

---

## The reusable list-selector

The clever bit is `select_from_list` — one function that handles **either** menu screen:

```c
static int select_from_list(const char **items, int count,
                            const char **hints, const char *title,
                            int board_w, int board_h);
```

Inputs:
- `items`: array of strings (options)
- `count`: how many options
- `hints`: array of strings (one per option, shown below)
- `title`: header text
- board dimensions

Returns: index of the chosen item, or `-1` if user pressed Q.

Both screens are just two calls to this function with different arrays:
```c
const char *MODE_ITEMS[] = { "Single Player", "AI Auto-play", "2 Player Local", "Quit" };
const char *DIFF_ITEMS[] = { "Easy", "Normal", "Hard", "Back" };
```

This is the **DRY principle** in C — no duplicated code, just data.

---

## The selection loop

```c
while (1) {
    if (keyPressed()) {
        int k = readKey();
        int prev = selected;
        if (k == 'q' || k == 'Q') return -1;
        else if (k == 'w' || k == 'W' || k == KEY_UP) {
            selected--;
            if (selected < 0) selected = count - 1;     // wrap to bottom
        } else if (k == 's' || k == 'S' || k == KEY_DOWN) {
            selected++;
            if (selected >= count) selected = 0;        // wrap to top
        } else if (k == KEY_ENTER || k == KEY_CR ||
                   k == 'd' || k == 'D' || k == KEY_RIGHT || k == ' ') {
            return selected;
        }
        if (selected != prev) {
            draw_menu_items(items, count, selected, board_w, top_y, hints);
            screen_flush();   // re-draw only when something changed
        }
    } else {
        usleep(10000);        // sleep 10ms when idle to avoid 100% CPU
    }
}
```

Three behaviours:
- **Q** → cancel (returns -1)
- **W / S / arrows** → move selection up/down with wrap-around
- **Enter / D / right arrow / space** → confirm

When nothing happens, we `usleep(10000)` — 10 milliseconds — so we don't burn CPU while idle.

### Selective redraw

A redraw happens **only when `selected` changes**. This avoids constant flicker.

---

## Drawing menu items

```c
for (i = 0; i < count; i++) {
    int y = top_y + (i * 2);                                // 1 blank row between items
    int color = (i == selected) ? CLR_SELECTED : CLR_ITEM;
    ... clear the line area, then:
    if (i == selected)
        screen_put_utf8(x + 2, y, "\xe2\x96\xb6");          // ▶ caret
    screen_put_str(x + 5, y, items[i]);
}
```

The selected item gets a `▶` caret and a brighter color. Everything else is plain.

---

## The orchestrator: `menu_run`

```c
MenuResult menu_run(int board_w, int board_h) {
    MenuResult res = { MODE_SINGLE, DIFF_NORMAL, 0 };

    while (1) {
        int mode_idx = select_from_list(MODE_ITEMS, MODE_COUNT, MODE_HINTS,
                                        "S N A K E — MAIN MENU", board_w, board_h);
        if (mode_idx < 0 || mode_idx == 3) { res.quit = 1; return res; }

        if (mode_idx == 0) res.mode = MODE_SINGLE;
        else if (mode_idx == 1) res.mode = MODE_AI;
        else res.mode = MODE_MULTI;

        int diff_idx = select_from_list(DIFF_ITEMS, DIFF_COUNT, DIFF_HINTS,
                                        "SELECT DIFFICULTY", board_w, board_h);
        if (diff_idx < 0) { res.quit = 1; return res; }
        if (diff_idx == 3) continue;       // "Back" → outer loop, redraw mode menu

        if (diff_idx == 0) res.difficulty = DIFF_EASY;
        else if (diff_idx == 1) res.difficulty = DIFF_NORMAL;
        else res.difficulty = DIFF_HARD;

        return res;
    }
}
```

Key flow control: if the user picks **"Back"** in the difficulty screen, we `continue` the outer loop → the mode menu redraws. Pressing **Q** at any point sets `quit = 1` and exits.

---

## Decorations

```c
// ASCII snake decoration — three diamonds across the top
screen_set_color_256(CLR_ACCENT, -1);
for (i = 0; i < 3; i++) {
    int gx = math_div(board_w, 2) - 12 + (i * 12);
    if (gx > 0 && gx < board_w - 1)
        screen_put_utf8(gx, 4, "\xe2\x97\x86");   // ◆
}
```

A small flourish — three orange `◆` diamonds at the top to break up the otherwise empty frame.

---

## 📢 Presentation Script — "Menu"

> "The menu module is a tiny state machine with two screens — first you pick a mode (Single, AI, or 2-Player), then a difficulty (Easy/Normal/Hard).
>
> The clever part is **one reusable function** called `select_from_list`. Both screens just pass it a different array of strings. That's the DRY principle — no duplicated logic.
>
> The loop is straightforward: `keyPressed?` → if yes, read it and update `selected`; if no, `usleep` for 10 ms so we don't pin a CPU. We only redraw when the highlight moves, so there's no flicker.
>
> Picking 'Back' in the difficulty screen returns to the mode menu via `continue` in the outer loop — that's how we get a navigable two-level UX in about 30 lines of control flow."

---

✅ Next: [`10-ai.md`](10-ai.md) — BFS pathfinding for the AI.
