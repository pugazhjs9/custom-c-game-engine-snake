/* ═══════════════════════════════════════════════════════════
   Snake Engine — Core Types (mirrors C engine data structures)
   ═══════════════════════════════════════════════════════════ */

export enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export enum GameStateEnum {
  MENU = "MENU",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  GAMEOVER = "GAMEOVER",
}

export interface Point {
  x: number;
  y: number;
}

export interface Segment extends Point {
  id: number;
}

export interface Food extends Point {
  type: "normal" | "bonus";
  timer?: number;
}

export interface GameState {
  snake: Segment[];
  food: Food;
  bonusFood: Food | null;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  highScore: number;
  state: GameStateEnum;
  level: number;
  tickMs: number;
  boardWidth: number;
  boardHeight: number;
  tickCount: number;
  foodEatenCount: number;
}

export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  initialLength: number;
  initialTickMs: number;
  minTickMs: number;
  speedDecrease: number;
  bonusChance: number;
  bonusLifetime: number;
  cellSize: number;
}

/* OS Simulation Event Types */
export type OSEventType =
  | "PROCESS_CREATED"
  | "PROCESS_TERMINATED"
  | "PROCESS_STATE_CHANGE"
  | "MEMORY_ALLOCATED"
  | "MEMORY_FREED"
  | "MEMORY_MERGED"
  | "CPU_TICK"
  | "CPU_CONTEXT_SWITCH"
  | "CPU_SCHEDULE"
  | "THREAD_CREATED"
  | "THREAD_STATE_CHANGE"
  | "INPUT_INTERRUPT"
  | "SYSCALL"
  | "FILE_WRITE"
  | "FILE_READ"
  | "NETWORK_SEND"
  | "NETWORK_RECEIVE"
  | "FRAME_RENDERED";

export interface OSEvent {
  id: string;
  type: OSEventType;
  timestamp: number;
  data: Record<string, unknown>;
  source: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  category: "cpu" | "memory" | "input" | "network" | "process" | "syscall" | "file" | "render";
  message: string;
  data?: Record<string, unknown>;
}

/* Memory Block (mirrors C engine BlockHeader) */
export interface MemoryBlock {
  id: number;
  offset: number;
  size: number;
  free: boolean;
  label?: string;
}

/* Process (PCB) */
export interface Process {
  pid: number;
  name: string;
  state: "NEW" | "READY" | "RUNNING" | "WAITING" | "TERMINATED";
  priority: number;
  cpuTime: number;
  arrivalTime: number;
  burstTime: number;
}

/* Thread */
export interface Thread {
  tid: number;
  name: string;
  state: "RUNNING" | "WAITING" | "BLOCKED" | "READY";
  processId: number;
}

/* Scheduling */
export type SchedulingAlgorithm = "FCFS" | "RR" | "PRIORITY" | "SJF";

export interface ScheduleEntry {
  pid: number;
  name: string;
  startTime: number;
  endTime: number;
  color: string;
}

/* Multiplayer */
export interface PlayerState {
  id: string;
  name: string;
  snake: Segment[];
  score: number;
  alive: boolean;
  color: string;
}

export interface MultiplayerState {
  roomId: string;
  players: PlayerState[];
  food: Food;
  bonusFood: Food | null;
  gameState: GameStateEnum;
}
