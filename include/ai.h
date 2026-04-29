#ifndef AI_H
#define AI_H

#include "game.h"

/* ── Auto-play AI (BFS shortest path to food, with safety fallback) ──
 *
 * ai_decide(g) inspects the board, the player-1 snake, and the food
 * position and returns a Direction the snake should move next tick.
 *
 * Strategy:
 *   1. Run BFS from snake head → food, treating snake body as obstacles
 *      and respecting wraparound walls (matching game_update logic).
 *   2. If a path exists, return the first move along the path.
 *   3. Otherwise fall back to any direction that does not result in an
 *      immediate collision; if none exists, return the current direction.
 */

Direction ai_decide(const Game *g);

#endif /* AI_H */
