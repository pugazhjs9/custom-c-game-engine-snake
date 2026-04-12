#ifndef GAME_H
#define GAME_H

/* ── Core game state & logic ── */

typedef enum { DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT } Direction;
typedef enum { STATE_MENU, STATE_PLAYING, STATE_PAUSED, STATE_GAMEOVER } GameState;

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
    /* snake (linked list) */
    Segment  *head;
    Segment  *tail;
    int       length;
    Direction dir;

    /* food */
    Point food;

    /* meta */
    int       score;
    int       high_score;
    GameState state;
    int       board_w;
    int       board_h;
    int       tick_ms;       /* milliseconds per game tick (speed) */
} Game;

void game_init(Game *g);                   /* reset / initialize game state    */
void game_handle_input(Game *g, char key); /* translate key → direction/state  */
void game_update(Game *g);                 /* advance one tick (move, collide) */
void game_render(const Game *g);           /* draw current frame               */
int  game_is_running(const Game *g);       /* 1 while not quit                 */
void game_spawn_food(Game *g);             /* place food at random free cell   */
void game_cleanup(Game *g);                /* any teardown needed              */

#endif /* GAME_H */
