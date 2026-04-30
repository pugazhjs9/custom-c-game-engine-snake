import { GameConfig } from "./types";

export const DEFAULT_CONFIG: GameConfig = {
  boardWidth: 30,
  boardHeight: 30,
  initialLength: 4,
  initialTickMs: 150,
  minTickMs: 50,
  speedDecrease: 4,
  bonusChance: 3,
  bonusLifetime: 50,
  cellSize: 18,
};

export const COLORS = {
  background: "#0a0a0f",
  grid: "rgba(255, 255, 255, 0.03)",
  gridLine: "rgba(255, 255, 255, 0.06)",
  snakeHead: "#00f0ff",
  snakeBody: "#0088aa",
  snakeBodyGradientEnd: "#005566",
  food: "#ff2288",
  foodGlow: "rgba(255, 34, 136, 0.4)",
  bonus: "#ffdd00",
  bonusGlow: "rgba(255, 221, 0, 0.4)",
  wall: "rgba(255, 255, 255, 0.08)",
  text: "#e4e4e7",
  death: "#ff4444",
  aiSnakeHead: "#a855f7",
  aiSnakeBody: "#7c3aed",
};

export const PLAYER_COLORS = [
  "#00f0ff",
  "#a855f7",
  "#22ff88",
  "#ff2288",
  "#ff8844",
  "#ffdd00",
];

export const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 75, 100];

export const SCORING = {
  food: 10,
  bonus: 50,
  levelMultiplier: 1.5,
};
