"use client";
import { useRef, useEffect, useCallback } from "react";
import { GameState, Food } from "@/engine/types";
import { COLORS } from "@/engine/constants";

interface GameCanvasProps {
  gameState: GameState;
  cellSize?: number;
  players?: any[];
  myId?: string;
  aiSnake?: { x: number; y: number }[];
  className?: string;
}

export default function GameCanvas({ gameState, cellSize = 18, players = [], myId, aiSnake, className }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = gameState.boardWidth * cellSize;
    const h = gameState.boardHeight * cellSize;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= gameState.boardWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, h);
      ctx.stroke();
    }
    for (let y = 0; y <= gameState.boardHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(w, y * cellSize);
      ctx.stroke();
    }

    // Food
    drawFood(ctx, gameState.food, cellSize);
    if (gameState.bonusFood) drawFood(ctx, gameState.bonusFood, cellSize);

    // AI Snake
    if (aiSnake && aiSnake.length > 0) {
      aiSnake.forEach((seg, i) => {
        const alpha = 1 - (i / aiSnake.length) * 0.6;
        ctx.fillStyle = i === 0 ? COLORS.aiSnakeHead : COLORS.aiSnakeBody;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = COLORS.aiSnakeHead;
        ctx.shadowBlur = i === 0 ? 15 : 5;
        roundRect(ctx, seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2, 4);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Other Players
    players.filter(p => p.id !== myId && p.alive).forEach(p => {
      p.snake.forEach((seg: any, i: number) => {
        const alpha = 1 - (i / p.snake.length) * 0.5;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = i === 0 ? p.color : "transparent";
        ctx.shadowBlur = i === 0 ? 15 : 0;
        roundRect(ctx, seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2, 4);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });

    // Player Snake (Local)
    const { snake } = gameState;
    snake.forEach((seg, i) => {
      const progress = i / Math.max(snake.length - 1, 1);
      const alpha = 1 - progress * 0.4;

      ctx.fillStyle = i === 0 ? "#fff" : gameState.state === "GAMEOVER" ? "rgba(255, 0, 80, 0.5)" : `rgba(0, 240, 255, ${alpha})`;
      ctx.shadowColor = i === 0 ? "#00f0ff" : "transparent";
      ctx.shadowBlur = i === 0 ? 20 : 0;

      roundRect(ctx, seg.x * cellSize + 1, seg.y * cellSize + 1, cellSize - 2, cellSize - 2, i === 0 ? 6 : 4);
      ctx.fill();

      // Head eyes
      if (i === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000";
        const eyeSize = cellSize * 0.15;
        const cx = seg.x * cellSize + cellSize / 2;
        const cy = seg.y * cellSize + cellSize / 2;
        const dir = gameState.direction;
        const ox = dir === "LEFT" ? -3 : dir === "RIGHT" ? 3 : 0;
        const oy = dir === "UP" ? -3 : dir === "DOWN" ? 3 : 0;
        ctx.beginPath();
        ctx.arc(cx + ox - 2, cy + oy - 2, eyeSize, 0, Math.PI * 2);
        ctx.arc(cx + ox + 2, cy + oy + 2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
  }, [gameState, cellSize, aiSnake, players, myId]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-xl border border-white/5 ${className || ""}`}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function drawFood(ctx: CanvasRenderingContext2D, food: Food, cellSize: number) {
  const isBonus = food.type === "bonus";
  const color = isBonus ? COLORS.bonus : COLORS.food;
  const glow = isBonus ? COLORS.bonusGlow : COLORS.foodGlow;

  // Blinking effect for bonus food near expiration
  if (isBonus && food.timer !== undefined && food.timer < 20) {
    const blinkSpeed = food.timer < 10 ? 0.3 : 0.15;
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * blinkSpeed));
    ctx.globalAlpha = alpha;
  }

  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(
    food.x * cellSize + cellSize / 2,
    food.y * cellSize + cellSize / 2,
    cellSize * 0.35,
    0, Math.PI * 2
  );
  ctx.fill();

  // Outer glow ring
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(
    food.x * cellSize + cellSize / 2,
    food.y * cellSize + cellSize / 2,
    cellSize * 0.45,
    0, Math.PI * 2
  );
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
