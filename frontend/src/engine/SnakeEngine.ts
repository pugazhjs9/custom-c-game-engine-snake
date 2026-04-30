import {
  Direction, GameState, GameStateEnum, GameConfig,
  Segment, Food, OSEvent, OSEventType,
} from "./types";
import { DEFAULT_CONFIG, LEVEL_THRESHOLDS, SCORING } from "./constants";

type EventCallback = (event: OSEvent) => void;

export class SnakeEngine {
  state: GameState;
  config: GameConfig;
  private listeners: Map<string, EventCallback[]> = new Map();
  private segIdCounter = 0;
  private memoryAllocated = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const cx = Math.floor(this.config.boardWidth / 2);
    const cy = Math.floor(this.config.boardHeight / 2);
    const snake: Segment[] = [];
    for (let i = 0; i < this.config.initialLength; i++) {
      snake.push({ x: cx - i, y: cy, id: this.segIdCounter++ });
    }
    return {
      snake, food: { x: 0, y: 0, type: "normal" }, bonusFood: null,
      direction: Direction.RIGHT, nextDirection: Direction.RIGHT,
      score: 0, highScore: 0, state: GameStateEnum.MENU, level: 1,
      tickMs: this.config.initialTickMs, boardWidth: this.config.boardWidth,
      boardHeight: this.config.boardHeight, tickCount: 0, foodEatenCount: 0,
    };
  }

  init() {
    this.state = this.createInitialState();
    this.state.state = GameStateEnum.PLAYING;
    this.memoryAllocated = this.config.initialLength * 24;
    this.spawnFood();
    this.emit("PROCESS_CREATED", { pid: 1, name: "snake_game", state: "RUNNING" });
    this.emit("MEMORY_ALLOCATED", { size: this.memoryAllocated, blocks: this.state.snake.length, operation: "game_init", cFunction: "mem_alloc(sizeof(Segment))" });
    this.emit("SYSCALL", { call: "tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw)", description: "Set terminal to raw mode" });
    this.emit("THREAD_CREATED", { tid: 1, name: "MainLoop", state: "RUNNING" });
    this.emit("THREAD_CREATED", { tid: 2, name: "InputHandler", state: "WAITING" });
    this.emit("THREAD_CREATED", { tid: 3, name: "Renderer", state: "READY" });
  }

  start() {
    if (this.state.state !== GameStateEnum.PLAYING) this.init();
    this.startGameLoop();
  }

  private startGameLoop() {
    this.stopGameLoop();
    this.lastTickMs = this.state.tickMs;
    this.tickInterval = setInterval(() => {
      if (this.state.state === GameStateEnum.PLAYING) this.update();
    }, this.state.tickMs);
  }

  private stopGameLoop() {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  private lastTickMs: number = 0;
  updateSpeed() {
    // Only restart the loop if tickMs actually changed — avoids interval phase drift
    if (this.state.tickMs === this.lastTickMs) return;
    this.lastTickMs = this.state.tickMs;
    this.stopGameLoop();
    this.startGameLoop();
  }

  handleInput(key: string) {
    if (this.state.state === GameStateEnum.GAMEOVER) {
      if (key === "r" || key === "R") {
        const hi = this.state.highScore; this.init(); this.state.highScore = hi; this.startGameLoop();
      }
      return;
    }
    if (this.state.state === GameStateEnum.MENU) { this.start(); return; }
    if (key === "p" || key === "P") {
      if (this.state.state === GameStateEnum.PLAYING) { this.state.state = GameStateEnum.PAUSED; this.stopGameLoop(); }
      else if (this.state.state === GameStateEnum.PAUSED) { this.state.state = GameStateEnum.PLAYING; this.startGameLoop(); }
      return;
    }
    this.emit("INPUT_INTERRUPT", { key, irq: 1, description: `Keyboard IRQ: key='${key}'`, cFunction: "read(STDIN_FILENO, &last_key, 1)" });
    const dir = this.state.direction;
    switch (key) {
      case "w": case "W": case "ArrowUp": if (dir !== Direction.DOWN) this.state.nextDirection = Direction.UP; break;
      case "s": case "S": case "ArrowDown": if (dir !== Direction.UP) this.state.nextDirection = Direction.DOWN; break;
      case "a": case "A": case "ArrowLeft": if (dir !== Direction.RIGHT) this.state.nextDirection = Direction.LEFT; break;
      case "d": case "D": case "ArrowRight": if (dir !== Direction.LEFT) this.state.nextDirection = Direction.RIGHT; break;
    }
  }

  update() {
    if (this.state.state !== GameStateEnum.PLAYING) return;
    this.state.direction = this.state.nextDirection;
    this.state.tickCount++;
    this.emit("CPU_TICK", { tick: this.state.tickCount, timeSlice: this.state.tickMs, process: "snake_game" });

    const head = this.state.snake[0];
    let nx = head.x, ny = head.y;
    switch (this.state.direction) {
      case Direction.UP: ny--; break;
      case Direction.DOWN: ny++; break;
      case Direction.LEFT: nx--; break;
      case Direction.RIGHT: nx++; break;
    }
    if (nx < 0) nx = this.state.boardWidth - 1;
    if (nx >= this.state.boardWidth) nx = 0;
    if (ny < 0) ny = this.state.boardHeight - 1;
    if (ny >= this.state.boardHeight) ny = 0;

    for (const seg of this.state.snake) {
      if (seg.x === nx && seg.y === ny) { this.gameOver(); return; }
    }

    this.state.snake.unshift({ x: nx, y: ny, id: this.segIdCounter++ });
    this.emit("MEMORY_ALLOCATED", { size: 24, total: this.memoryAllocated + 24, operation: "new head", cFunction: "mem_alloc(sizeof(Segment))" });
    this.memoryAllocated += 24;

    const ateFood = nx === this.state.food.x && ny === this.state.food.y;
    const ateBonus = this.state.bonusFood && nx === this.state.bonusFood.x && ny === this.state.bonusFood.y;

    if (ateFood) {
      this.state.score += Math.floor(SCORING.food * (1 + (this.state.level - 1) * 0.5));
      if (this.state.score > this.state.highScore) this.state.highScore = this.state.score;
      this.updateLevel();
      if (this.config.speedDecrease > 0) {
        this.state.tickMs = Math.max(this.state.tickMs - this.config.speedDecrease, this.config.minTickMs);
        this.updateSpeed();
      }
      this.emit("FOOD_EATEN", { x: nx, y: ny });
      
      this.state.foodEatenCount++;
      if (this.state.foodEatenCount >= 5) {
        this.state.foodEatenCount = 0;
        this.spawnFood();
        this.spawnBonusFood();
      } else {
        this.spawnFood();
      }
    } else if (ateBonus) {
      this.state.score += Math.floor(SCORING.bonus * (1 + (this.state.level - 1) * 0.5));
      if (this.state.score > this.state.highScore) this.state.highScore = this.state.score;
      this.state.bonusFood = null;
      if (this.config.speedDecrease > 0) {
        this.state.tickMs = Math.max(this.state.tickMs - this.config.speedDecrease * 2, this.config.minTickMs);
        this.updateSpeed();
      }
    } else {
      this.state.snake.pop();
      this.emit("MEMORY_FREED", { size: 24, total: this.memoryAllocated - 24, operation: "remove tail", cFunction: "mem_free(tail)" });
      this.memoryAllocated = Math.max(0, this.memoryAllocated - 24);
    }

    if (this.state.bonusFood?.timer !== undefined) {
      this.state.bonusFood.timer--;
      if (this.state.bonusFood.timer <= 0) this.state.bonusFood = null;
    }
    this.emit("FRAME_RENDERED", { tick: this.state.tickCount, snakeLength: this.state.snake.length });
  }

  public gameOver() {
    this.state.state = GameStateEnum.GAMEOVER;
    this.stopGameLoop();
    this.emit("PROCESS_TERMINATED", { pid: 1, name: "snake_game", exitCode: 0 });
  }

  public setFood(x: number, y: number) {
    this.state.food = { x, y, type: "normal" };
  }

  private spawnFood() {
    let x: number, y: number;
    do { x = Math.floor(Math.random() * this.state.boardWidth); y = Math.floor(Math.random() * this.state.boardHeight); }
    while (this.isOnSnake(x, y));
    this.state.food = { x, y, type: "normal" };
  }

  private spawnBonusFood() {
    let x: number, y: number;
    do { x = Math.floor(Math.random() * this.state.boardWidth); y = Math.floor(Math.random() * this.state.boardHeight); }
    while (this.isOnSnake(x, y) || (x === this.state.food.x && y === this.state.food.y));
    this.state.bonusFood = { x, y, type: "bonus", timer: this.config.bonusLifetime };
  }

  private isOnSnake(x: number, y: number): boolean {
    return this.state.snake.some((s) => s.x === x && s.y === y);
  }

  private updateLevel() {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.state.score >= LEVEL_THRESHOLDS[i] * SCORING.food) { this.state.level = i + 1; break; }
    }
  }

  destroy() { this.stopGameLoop(); this.listeners.clear(); }

  on(type: string, callback: EventCallback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(callback);
  }
  onAny(callback: EventCallback) { this.on("*", callback); }

  private emit(type: OSEventType, data: Record<string, unknown>) {
    const event: OSEvent = { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, timestamp: Date.now(), data, source: "SnakeEngine" };
    [...(this.listeners.get(type) || []), ...(this.listeners.get("*") || [])].forEach((cb) => cb(event));
  }

  getMemoryUsage() {
    return { allocated: this.memoryAllocated, total: 65536, blocks: this.state.snake.length, headerSize: 12 };
  }
}
