import { Server as SocketIOServer, Socket } from "socket.io";
import { query } from "../lib/db";

const BOARD_WIDTH = 28;
const BOARD_HEIGHT = 28;
const GRACE_TICKS = 15;
const SERVER_TICK_MS = 200;
const INITIAL_SNAKE_LENGTH = 4;

const COLORS = ["#00f0ff", "#a855f7", "#22ff88", "#ff2288", "#ff8844", "#ffdd00"];
const SPAWN_POSITIONS = [
  { x: 4, y: 4, dir: "RIGHT" },
  { x: 23, y: 23, dir: "LEFT" },
  { x: 23, y: 4, dir: "DOWN" },
  { x: 4, y: 23, dir: "UP" },
  { x: 14, y: 4, dir: "RIGHT" },
  { x: 14, y: 23, dir: "LEFT" },
];

interface PlayerInfo {
  id: string;
  name: string;
  room: string;
  snake: Array<{ x: number; y: number }>;
  direction: string;
  nextDirection: string;
  score: number;
  level: number;
  alive: boolean;
  color: string;
  spawnTick: number;
}

interface RoomData {
  players: Map<string, PlayerInfo>;
  food: { x: number; y: number };
  bonusFood: { x: number; y: number; type: string; timer: number } | null;
  foodEatenCount: number;
  tickCount: number;
  tickInterval: ReturnType<typeof setInterval> | null;
}

const rooms = new Map<string, RoomData>();

function spawnFood(rd: RoomData) {
  const occupied = new Set<string>();
  rd.players.forEach(p => p.snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`)));
  let x: number, y: number, attempts = 0;
  do {
    x = Math.floor(Math.random() * BOARD_WIDTH);
    y = Math.floor(Math.random() * BOARD_HEIGHT);
    attempts++;
  } while ((occupied.has(`${x},${y}`) || (rd.bonusFood && rd.bonusFood.x === x && rd.bonusFood.y === y)) && attempts < 500);
  rd.food = { x, y };
}

function spawnBonusFood(rd: RoomData) {
  const occupied = new Set<string>();
  rd.players.forEach(p => p.snake.forEach(seg => occupied.add(`${seg.x},${seg.y}`)));
  let x: number, y: number, attempts = 0;
  do {
    x = Math.floor(Math.random() * BOARD_WIDTH);
    y = Math.floor(Math.random() * BOARD_HEIGHT);
    attempts++;
  } while ((occupied.has(`${x},${y}`) || (rd.food.x === x && rd.food.y === y)) && attempts < 500);
  rd.bonusFood = { x, y, type: "bonus", timer: 50 }; // 50 ticks * 200ms = 10s
}

function buildInitialSnake(spawnIdx: number): { snake: Array<{ x: number; y: number }>; dir: string } {
  const info = SPAWN_POSITIONS[spawnIdx % SPAWN_POSITIONS.length];
  const snake: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    let sx = info.x, sy = info.y;
    switch (info.dir) {
      case "RIGHT": sx -= i; break;
      case "LEFT": sx += i; break;
      case "DOWN": sy -= i; break;
      case "UP": sy += i; break;
    }
    snake.push({ x: sx, y: sy });
  }
  return { snake, dir: info.dir };
}

function startRoomTick(io: SocketIOServer, roomId: string) {
  const roomData = rooms.get(roomId);
  if (!roomData || roomData.tickInterval) return;

  roomData.tickInterval = setInterval(() => {
    const rd = rooms.get(roomId);
    if (!rd) return;
    rd.tickCount++;

    const allPlayers = Array.from(rd.players.values());
    const alive = allPlayers.filter(p => p.alive);

    // 1. Move all alive snakes
    for (const player of alive) {
      player.direction = player.nextDirection;
      const head = player.snake[0];
      let nx = head.x, ny = head.y;
      switch (player.direction) {
        case "UP": ny--; break;
        case "DOWN": ny++; break;
        case "LEFT": nx--; break;
        case "RIGHT": nx++; break;
      }
      if (nx < 0) nx = BOARD_WIDTH - 1;
      if (nx >= BOARD_WIDTH) nx = 0;
      if (ny < 0) ny = BOARD_HEIGHT - 1;
      if (ny >= BOARD_HEIGHT) ny = 0;

      player.snake.unshift({ x: nx, y: ny });

      // Food check
      if (nx === rd.food.x && ny === rd.food.y) {
        player.score += 10 * player.level;
        const thresholds = [0, 50, 150, 300, 500, 750, 1000];
        for (let i = thresholds.length - 1; i >= 0; i--) {
          if (player.score >= thresholds[i]) { player.level = i + 1; break; }
        }
        rd.foodEatenCount++;
        if (rd.foodEatenCount >= 5) {
          rd.foodEatenCount = 0;
          spawnFood(rd);
          spawnBonusFood(rd);
        } else {
          spawnFood(rd);
        }
      } else if (rd.bonusFood && nx === rd.bonusFood.x && ny === rd.bonusFood.y) {
        player.score += 50 * player.level;
        rd.bonusFood = null;
      } else {
        player.snake.pop();
      }
    }

    // 2. Collision Detection (Head vs any Body)
    const playersToKill = new Set<string>();
    const activePlayers = Array.from(rd.players.values()).filter(p => p.alive);
    
    for (const player of activePlayers) {
      if (rd.tickCount - player.spawnTick < GRACE_TICKS) continue;
      const head = player.snake[0];

      for (const other of activePlayers) {
        // Check head against body segments
        // If it's self-collision, skip the head itself (index 0)
        const segmentsToRotate = (other.id === player.id) ? other.snake.slice(1) : other.snake;
        
        if (segmentsToRotate.some(seg => seg.x === head.x && seg.y === head.y)) {
          playersToKill.add(player.id);
          const killerName = (other.id === player.id) ? null : other.name;
          const reason = killerName ? `Crashed into ${killerName}'s process space` : "Segmentation Fault (Self-collision)";
          io.to(player.id).emit("server:you_died", { killedBy: killerName, reason });
          break;
        }
      }
    }

    // 3. Process deaths
    playersToKill.forEach(pid => {
      const p = rd.players.get(pid);
      if (p) {
        p.alive = false;
        saveScore(p);
      }
    });

    // Update bonus timer
    if (rd.bonusFood) {
      rd.bonusFood.timer--;
      if (rd.bonusFood.timer <= 0) rd.bonusFood = null;
    }

    // Broadcast complete state
    io.to(roomId).emit("game:state", {
      players: allPlayers.map(p => ({
        id: p.id, name: p.name, snake: p.snake, direction: p.direction,
        score: p.score, level: p.level, alive: p.alive, color: p.color,
      })),
      food: rd.food,
      bonusFood: rd.bonusFood,
      tickCount: rd.tickCount,
    });
  }, SERVER_TICK_MS);
}

function stopRoomTick(roomId: string) {
  const roomData = rooms.get(roomId);
  if (roomData?.tickInterval) {
    clearInterval(roomData.tickInterval);
    roomData.tickInterval = null;
  }
}

async function saveScore(player: PlayerInfo) {
  try {
    await query(
      `INSERT INTO scores (playerName, score, mode, level, duration, snakeLength) VALUES ($1, $2, $3, $4, $5, $6)`,
      [player.name, player.score, "multiplayer", player.level, 0, player.snake.length]
    );
    console.log(`💾 Saved score for ${player.name}: ${player.score}`);
  } catch (err) {
    console.error("❌ Failed to save score:", err);
  }
}

export function setupGameSocket(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    let currentRoom = "";

    socket.on("room:join", ({ name, room }: { name: string; room: string }) => {
      const roomId = room || `room-${Date.now()}`;
      currentRoom = roomId;
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { players: new Map(), food: { x: 14, y: 14 }, bonusFood: null, foodEatenCount: 0, tickCount: 0, tickInterval: null });
        spawnFood(rooms.get(roomId)!);
      }

      const rd = rooms.get(roomId)!;
      rd.players.delete(socket.id); // Remove if respawning
      const idx = rd.players.size;
      const colorIdx = idx % COLORS.length;
      const { snake, dir } = buildInitialSnake(idx);

      const player: PlayerInfo = {
        id: socket.id,
        name: name || `Player${idx + 1}`,
        room: roomId, snake, direction: dir, nextDirection: dir,
        score: 0, level: 1, alive: true, color: COLORS[colorIdx],
        spawnTick: rd.tickCount,
      };
      rd.players.set(socket.id, player);

      socket.emit("room:joined", { roomId, playerId: socket.id, color: player.color, food: rd.food });
      io.to(roomId).emit("players:update", Array.from(rd.players.values()).map(p => ({
        id: p.id, name: p.name, snake: p.snake, score: p.score, alive: p.alive, color: p.color, direction: p.direction,
      })));
      console.log(`  → ${player.name} joined room ${roomId} (${rd.players.size} players)`);
      startRoomTick(io, roomId);
    });

    // Direction input only — server handles all movement
    socket.on("player:direction", ({ direction }: { direction: string }) => {
      if (!currentRoom || !rooms.has(currentRoom)) return;
      const player = rooms.get(currentRoom)!.players.get(socket.id);
      if (!player || !player.alive) return;
      const opp: Record<string, string> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (opp[direction] !== player.direction) {
        player.nextDirection = direction;
      }
    });

    // Legacy no-ops
    socket.on("player:move", () => {});
    socket.on("food:eaten", () => {});
    socket.on("player:died", () => {});

    socket.on("chat:message", (msg: string) => {
      if (!currentRoom) return;
      const rd = rooms.get(currentRoom);
      const pName = rd?.players.get(socket.id)?.name || "Unknown";
      io.to(currentRoom).emit("chat:message", { name: pName, message: msg, timestamp: Date.now() });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      if (currentRoom && rooms.has(currentRoom)) {
        const rd = rooms.get(currentRoom)!;
        rd.players.delete(socket.id);
        if (rd.players.size === 0) { stopRoomTick(currentRoom); rooms.delete(currentRoom); }
        else {
          io.to(currentRoom).emit("players:update", Array.from(rd.players.values()).map(p => ({
            id: p.id, name: p.name, snake: p.snake, score: p.score, alive: p.alive, color: p.color, direction: p.direction,
          })));
        }
      }
    });
  });
}
