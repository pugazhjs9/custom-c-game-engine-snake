#ifndef GAME_H
#define GAME_H

/* ── Core game state & logic ── */

typedef enum { DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT } Direction;
typedef enum { STATE_MENU, STATE_PLAYING, STATE_PAUSED, STATE_GAMEOVER } GameState;
typedef enum { MODE_SINGLE, MODE_AI, MODE_MULTI } GameMode;
typedef enum { DIFF_EASY, DIFF_NORMAL, DIFF_HARD } Difficulty;

typedef struct Segment {
    int x;
    int y;
    struct Segment *next;
} Segment;

typedef struct {
    int x;
    int y;
} Point;

typedef struct {
    Segment   *head;
    Segment   *tail;
    int        length;
    Direction  dir;
    Direction  pending_dir;     /* direction queued by input this tick */
    int        has_pending;     /* 1 if pending_dir was set this tick   */
    int        score;
    int        alive;
    int        color_head;
    int        color_body;
    int        id;              /* 1 or 2 */
} Snake;

typedef struct {
    /* mode / config */
    GameMode    mode;
    Difficulty  difficulty;

    /* snakes */
    Snake       p1;
    Snake       p2;             /* used only in MODE_MULTI                  */

    /* food */
    Point       food;
    Point       bonus_food;
    int         bonus_active;
    int         bonus_timer;
    int         ticks_since_food;

    /* meta */
    int         high_score;     /* live max-of-run displayed in HUD          */
    int         loaded_high_score; /* persisted value at session start        */
    GameState   state;
    int         board_w;
    int         board_h;
    int         tick_ms;
    int         base_tick_ms;
    int         winner;         /* 0 = none, 1 = P1, 2 = P2, 3 = draw       */
} Game;

/* Lifecycle */
void game_init(Game *g);
void game_cleanup(Game *g);

/* Per-tick */
void game_set_player_dir(Game *g, int player, Direction d); /* player=1 or 2 */
void game_update(Game *g);
void game_render(const Game *g);
void game_full_redraw(Game *g);
int  game_is_running(const Game *g);

/* Food */
void game_spawn_food(Game *g);

/* Helpers used by AI / score persistence */
const char *game_score_tag(const Game *g);
int  game_cell_blocked(const Game *g, int x, int y, int ignore_p1_tail, int ignore_p2_tail);
void game_wrap_coords(const Game *g, int *x, int *y);

#endif /* GAME_H */
