import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./lib/db";
import scoreRoutes from "./routes/scores";
import leaderboardRoutes from "./routes/leaderboard";
import { setupGameSocket } from "./sockets/gameSocket";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Routes
app.use("/api/scores", scoreRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// Socket.io
setupGameSocket(io);

// PostgreSQL connection
if (process.env.DATABASE_URL) {
  initDb()
    .then(() => console.log("✅ PostgreSQL connected"))
    .catch((err) => console.log("⚠️ PostgreSQL not connected:", err.message));
} else {
  console.log("⚠️ No DATABASE_URL — running without database");
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🐍 SnakeOS Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}\n`);
});

export { io };
