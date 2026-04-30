import { Direction, Point, Segment } from "./types";

/* A* pathfinding AI for the snake game */
export class AIEngine {
  private boardWidth: number;
  private boardHeight: number;

  constructor(boardWidth: number, boardHeight: number) {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
  }

  getNextDirection(
    snake: Segment[],
    food: Point,
    currentDir: Direction,
    difficulty: "easy" | "medium" | "hard" = "hard"
  ): Direction {
    switch (difficulty) {
      case "easy": return this.randomSafe(snake, currentDir);
      case "medium": return this.greedy(snake, food, currentDir);
      case "hard": return this.aStar(snake, food, currentDir);
    }
  }

  private randomSafe(snake: Segment[], currentDir: Direction): Direction {
    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const safe = dirs.filter((d) => {
      if (this.isOpposite(d, currentDir)) return false;
      const next = this.getNext(snake[0], d);
      return !this.isCollision(next, snake);
    });
    return safe.length > 0 ? safe[Math.floor(Math.random() * safe.length)] : currentDir;
  }

  private greedy(snake: Segment[], food: Point, currentDir: Direction): Direction {
    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    let bestDir = currentDir;
    let bestDist = Infinity;
    for (const d of dirs) {
      if (this.isOpposite(d, currentDir)) continue;
      const next = this.getNext(snake[0], d);
      if (this.isCollision(next, snake)) continue;
      const dist = Math.abs(next.x - food.x) + Math.abs(next.y - food.y);
      if (dist < bestDist) { bestDist = dist; bestDir = d; }
    }
    return bestDir;
  }

  private aStar(snake: Segment[], food: Point, currentDir: Direction): Direction {
    const head = snake[0];
    const snakeSet = new Set(snake.map((s) => `${s.x},${s.y}`));
    const open: { x: number; y: number; g: number; f: number; dir: Direction; parent: null | typeof open[0] }[] = [];
    const closed = new Set<string>();

    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    for (const d of dirs) {
      if (this.isOpposite(d, currentDir)) continue;
      const next = this.getNext(head, d);
      if (snakeSet.has(`${next.x},${next.y}`)) continue;
      const h = Math.abs(next.x - food.x) + Math.abs(next.y - food.y);
      open.push({ x: next.x, y: next.y, g: 1, f: 1 + h, dir: d, parent: null });
    }

    let iterations = 0;
    while (open.length > 0 && iterations < 500) {
      iterations++;
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      if (current.x === food.x && current.y === food.y) {
        let node = current;
        while (node.parent) node = node.parent;
        return node.dir;
      }
      closed.add(`${current.x},${current.y}`);
      for (const d of dirs) {
        const next = this.getNext(current, d);
        const key = `${next.x},${next.y}`;
        if (closed.has(key) || snakeSet.has(key)) continue;
        const g = current.g + 1;
        const h = Math.abs(next.x - food.x) + Math.abs(next.y - food.y);
        const existing = open.find((n) => n.x === next.x && n.y === next.y);
        if (!existing || g < existing.g) {
          if (existing) { existing.g = g; existing.f = g + h; existing.parent = current; }
          else { open.push({ x: next.x, y: next.y, g, f: g + h, dir: current.dir, parent: current }); }
        }
      }
    }

    return this.greedy(snake, food, currentDir);
  }

  private getNext(pos: Point, dir: Direction): Point {
    let { x, y } = pos;
    switch (dir) {
      case Direction.UP: y--; break;
      case Direction.DOWN: y++; break;
      case Direction.LEFT: x--; break;
      case Direction.RIGHT: x++; break;
    }
    if (x < 0) x = this.boardWidth - 1;
    if (x >= this.boardWidth) x = 0;
    if (y < 0) y = this.boardHeight - 1;
    if (y >= this.boardHeight) y = 0;
    return { x, y };
  }

  private isCollision(pos: Point, snake: Segment[]): boolean {
    return snake.some((s) => s.x === pos.x && s.y === pos.y);
  }

  private isOpposite(a: Direction, b: Direction): boolean {
    return (a === Direction.UP && b === Direction.DOWN) || (a === Direction.DOWN && b === Direction.UP) ||
      (a === Direction.LEFT && b === Direction.RIGHT) || (a === Direction.RIGHT && b === Direction.LEFT);
  }
}
