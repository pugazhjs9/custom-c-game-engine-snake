# SnakeOS 🐍💻

SnakeOS is a modern, full-stack reimagining of the classic Snake game. Evolving from a low-level C engine, the project has been completely transformed into a rich web application. It features a unique "Operating System" visualizer, advanced AI opponents, and robust real-time multiplayer capabilities.

![SnakeOS Demo](./assets/thumbnail.png)

---

## ✨ Features

- **Real-Time Multiplayer** 🌐
  - Server-authoritative architecture using **Socket.io**.
  - Room-based matchmaking with synchronized game states.
  - Comprehensive collision detection (self-collision and cross-player segmentation faults).
  
- **Advanced AI Opponents** 🤖
  - Play against AI snakes utilizing different algorithms.
  - Difficulty levels range from Random movement to Greedy heuristics and advanced **A* Pathfinding**.

- **OS Internals Visualizer** ⚙️
  - A unique simulation view that maps game events to OS-level concepts.
  - Real-time visualization of Memory Allocation, CPU Scheduling, Thread Management, and System Calls as the game engine ticks.

- **Dynamic Gameplay Mechanics** 🍎
  - Level progression system with increasing speeds.
  - Special timed **Bonus Fruits** that spawn dynamically after eating consecutive standard fruits.
  
- **Global Leaderboards** 🏆
  - Persistent score tracking backed by **PostgreSQL**.
  - Filterable leaderboards by game mode (Solo, AI, Multiplayer) and time periods.

- **Premium UI/UX** 🎨
  - Built with modern web aesthetics using **Tailwind CSS** and **Framer Motion**.
  - Features neon glow effects, glassmorphism components, and smooth micro-animations.

---

## 🏗️ Architecture & Tech Stack

SnakeOS is divided into a decoupled frontend and backend:

### **Frontend**
- **Framework**: Next.js 14+ (React)
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: Zustand
- **Networking**: Socket.io-client
- **Game Engine**: Custom TypeScript tick-based engine emitting OS-style simulation events.

### **Backend**
- **Environment**: Node.js
- **Server**: Express.js
- **WebSockets**: Socket.io (Handles server-authoritative multiplayer game loops)
- **Database**: PostgreSQL (pg)

---

## 🚀 Getting Started

Follow these instructions to get the project running locally.

### Prerequisites
- Node.js (v18 or newer)
- PostgreSQL running locally or via a cloud provider

### 1. Database Setup
Ensure PostgreSQL is running and create a database for SnakeOS.
```sql
CREATE DATABASE snakeos;
```

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and start the server.
```bash
cd backend
npm install

# Create a .env file (or set environment variables)
# DATABASE_URL=postgres://user:password@localhost:5432/snakeos
# PORT=3001

npm run dev
```
*Note: The backend will automatically initialize the required PostgreSQL tables on startup.*

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, install dependencies, and start the development server.
```bash
cd frontend
npm install

# Create a .env.local file
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

npm run dev
```

### 4. Play!
Open your browser and navigate to `http://localhost:3000`.

---

## 🎮 Game Modes

1. **Terminal Mode**: A retro, CLI-styled implementation of the game.
2. **Solo Mode**: Classic gameplay with persistent high-score tracking.
3. **AI Mode**: Compete against the computer on the same board.
4. **Multiplayer**: Generate a room code and invite friends for real-time competitive Snake.

---

## 📜 License

This project is open source and available under the MIT License.
