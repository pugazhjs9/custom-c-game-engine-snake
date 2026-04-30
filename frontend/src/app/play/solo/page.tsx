"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { SnakeEngine } from "@/engine/SnakeEngine";
import { GameState, GameStateEnum } from "@/engine/types";
import { useLogStore } from "@/store/logStore";
import { useOSStore } from "@/store/osStore";
import { usePlayerStore } from "@/store/playerStore";
import GameCanvas from "@/components/game/GameCanvas";
import LogPanel from "@/components/logs/LogPanel";
import ProcessManager from "@/components/os-visualizer/ProcessManager";
import CPUScheduler from "@/components/os-visualizer/CPUScheduler";
import MemoryVisualizer from "@/components/os-visualizer/MemoryVisualizer";
import ThreadVisualizer from "@/components/os-visualizer/ThreadVisualizer";
import InterruptHandler from "@/components/os-visualizer/InterruptHandler";
import SystemCallLog from "@/components/os-visualizer/SystemCallLog";
import NeonButton from "@/components/ui/NeonButton";
import GlassCard from "@/components/ui/GlassCard";
import GlowText from "@/components/ui/GlowText";
import { Play, Pause, RotateCcw, Gamepad2, ArrowRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function SoloGamePage() {
  const engineRef = useRef<SnakeEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [tick, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<"os" | "logs">("os");
  const [scoreSaved, setScoreSaved] = useState(false);
  const addFromEvent = useLogStore((s) => s.addFromEvent);
  const osStore = useOSStore();

  const playerName = usePlayerStore((s) => s.playerName);
  const setPlayerName = usePlayerStore((s) => s.setPlayerName);
  const [nameInput, setNameInput] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (playerName) {
      setNameInput(playerName);
      setNameSet(true);
    }
  }, [playerName]);

  const startTimeRef = useRef<number>(0);

  const saveScore = useCallback(async (engine: SnakeEngine) => {
    if (scoreSaved || !playerName) return;
    setScoreSaved(true);
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    try {
      await fetch(`${API_URL}/api/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          score: engine.state.score,
          mode: "solo",
          level: engine.state.level,
          duration,
          snakeLength: engine.state.snake.length,
        }),
      });
    } catch (err) {
      console.error("Failed to save score:", err);
    }
  }, [playerName, scoreSaved]);

  const initEngine = useCallback(() => {
    if (engineRef.current) engineRef.current.destroy();
    osStore.reset();
    useLogStore.getState().clearLogs();
    setScoreSaved(false);
    startTimeRef.current = Date.now();

    const engine = new SnakeEngine({ boardWidth: 28, boardHeight: 28, cellSize: 22 });

    engine.onAny((event) => {
      addFromEvent(event);

      // Update OS store based on events
      switch (event.type) {
        case "PROCESS_CREATED":
          osStore.addProcess({
            pid: event.data.pid as number,
            name: event.data.name as string,
            state: "RUNNING",
            priority: 1,
            cpuTime: 0,
            arrivalTime: Date.now(),
            burstTime: 0,
          });
          break;
        case "PROCESS_STATE_CHANGE":
          osStore.updateProcess(event.data.pid as number, event.data.to as "RUNNING" | "WAITING" | "TERMINATED");
          break;
        case "PROCESS_TERMINATED":
          osStore.updateProcess(event.data.pid as number, "TERMINATED");
          // Save score on game over
          saveScore(engine);
          break;
        case "THREAD_CREATED":
          osStore.addThread({
            tid: event.data.tid as number,
            name: event.data.name as string,
            state: event.data.state as "RUNNING" | "WAITING" | "READY",
            processId: 1,
          });
          break;
        case "CPU_TICK": {
          const cpuUsage = 30 + Math.random() * 40;
          osStore.pushCpuUsage(cpuUsage);
          osStore.addScheduleEntry({
            pid: 1,
            name: "snake",
            startTime: (event.data.tick as number) * (event.data.timeSlice as number),
            endTime: (event.data.tick as number) * (event.data.timeSlice as number) + (event.data.timeSlice as number),
            color: "#00f0ff",
          });
          break;
        }
        case "MEMORY_ALLOCATED":
        case "MEMORY_FREED": {
          if (engine) {
            const mem = engine.getMemoryUsage();
            const used = mem.allocated;
            const free = mem.total - used;
            osStore.setMemoryBlocks([
              { id: 1, offset: 0, size: used, free: false, label: "Snake segments" },
              { id: 2, offset: used + 12, size: Math.max(0, free - 12), free: true },
            ]);
          }
          break;
        }
      }
    });

    engineRef.current = engine;
    engine.init();
    setGameState({ ...engine.state });

    // Render loop
    const renderLoop = setInterval(() => {
      if (engineRef.current) {
        setGameState({ ...engineRef.current.state });
        setTick((t) => t + 1);
      }
    }, 50);

    engine.start();

    return () => clearInterval(renderLoop);
  }, [saveScore]);

  useEffect(() => {
    if (!nameSet) return;
    const cleanup = initEngine();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", "p", "P", "r", "R"].includes(e.key)) {
        e.preventDefault();
        engineRef.current?.handleInput(e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { cleanup(); window.removeEventListener("keydown", handleKeyDown); engineRef.current?.destroy(); };
  }, [initEngine, nameSet]);

  const handleRestart = () => { initEngine(); };

  const handlePause = () => { engineRef.current?.handleInput("p"); setGameState(engineRef.current ? { ...engineRef.current.state } : null); };

  const handleNameSubmit = () => {
    if (!nameInput.trim()) return;
    setPlayerName(nameInput.trim());
    setNameSet(true);
  };

  // ═══ NAME ENTRY SCREEN ═══
  if (!mounted || !nameSet) {
    return (
      <div className="fixed inset-0 top-16 overflow-hidden flex flex-col items-center justify-center bg-slate-950/20 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <Gamepad2 className="w-16 h-16 text-neon-cyan mb-4 mx-auto" />
            <h1 className="text-3xl font-bold mb-2">Solo <GlowText color="cyan">Mode</GlowText></h1>
            <p className="text-muted text-sm">Your scores will be saved to the leaderboard</p>
          </div>
          <GlassCard className="p-8">
            <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">Initialize Player</h3>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted/40 mb-6 focus:outline-none focus:border-neon-cyan/50 transition-all shadow-inner"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            />
            <NeonButton variant="cyan" className="w-full" onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              Start Game <ArrowRight className="w-4 h-4 ml-2" />
            </NeonButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (!gameState) return null;

  const isPlaying = gameState.state === GameStateEnum.PLAYING;
  const isPaused = gameState.state === GameStateEnum.PAUSED;
  const isGameOver = gameState.state === GameStateEnum.GAMEOVER;

  return (
    <div className="fixed inset-0 top-16 overflow-hidden flex flex-col bg-slate-950/20">
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-5 h-5 text-neon-cyan" />
            <h1 className="text-xl font-bold">
              Solo <GlowText color="cyan">Mode</GlowText>
            </h1>
            <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded-md border border-white/5">{playerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <NeonButton variant="cyan" size="sm" onClick={handlePause}>
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </NeonButton>
            <NeonButton variant="purple" size="sm" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4" />
            </NeonButton>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 min-h-0">
          {/* Left: Game Area */}
          <div className="space-y-4">
            {/* HUD */}
            <div className="glass rounded-xl px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-muted uppercase tracking-wider">Score</span>
                  <div className="text-2xl font-bold text-neon-cyan font-mono">{gameState.score}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase tracking-wider">High</span>
                  <div className="text-2xl font-bold text-neon-yellow font-mono">{gameState.highScore}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase tracking-wider">Level</span>
                  <div className="text-2xl font-bold text-neon-purple font-mono">{gameState.level}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>Speed: {Math.round(1000 / gameState.tickMs)}fps</span>
                <span>Length: {gameState.snake.length}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? "bg-neon-green animate-pulse" : isPaused ? "bg-neon-yellow" : "bg-neon-pink"}`} />
                  <span>{isPlaying ? "Running" : isPaused ? "Paused" : "Game Over"}</span>
                </div>
              </div>
            </div>

            {/* Game Canvas */}
            <div className="relative flex-1 min-h-0 glass rounded-2xl overflow-hidden flex items-center justify-center bg-black/40 shadow-2xl">
              <GameCanvas gameState={gameState} cellSize={22} className="max-h-full max-w-full w-auto h-auto object-contain" />

              {/* Game Over Overlay */}
              {isGameOver && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl z-20"
                >
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <h2 className="text-6xl font-black text-neon-pink mb-4 tracking-tighter drop-shadow-[0_0_20px_rgba(255,0,80,0.5)]">GAME OVER</h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-md">
                      <p className="text-muted text-xs uppercase tracking-widest mb-1">Final Process Score</p>
                      <div className="text-5xl font-black text-neon-cyan font-mono">{gameState.score}</div>
                    </div>
                    <p className="text-sm text-muted/60 mb-8">{scoreSaved ? "✓ Data committed to leaderboard" : "Committing data..."}</p>
                    <div className="flex gap-4 justify-center">
                      <NeonButton variant="cyan" size="lg" onClick={handleRestart}>Restart Process</NeonButton>
                    </div>
                    <p className="mt-6 text-xs text-muted/40 animate-pulse">Press R to quick restart</p>
                  </motion.div>
                </motion.div>
              )}

              {/* Paused Overlay */}
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl"
                >
                  <h2 className="text-3xl font-bold text-neon-yellow mb-2">PAUSED</h2>
                  <p className="text-sm text-muted">Press P to resume</p>
                </motion.div>
              )}
            </div>

            {/* Controls */}
            <div className="glass rounded-xl px-5 py-3 text-xs text-muted flex justify-between">
              <span>WASD / Arrow Keys: Move</span>
              <span>P: Pause</span>
              <span>R: Restart (on game over)</span>
            </div>
          </div>

          {/* Right: OS Panels */}
          <div className="space-y-4">
            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 glass rounded-xl">
              <button
                onClick={() => setActiveTab("os")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "os" ? "bg-neon-cyan/10 text-neon-cyan" : "text-muted hover:text-foreground"}`}
              >
                OS Internals
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "logs" ? "bg-neon-green/10 text-neon-green" : "text-muted hover:text-foreground"}`}
              >
                System Logs
              </button>
            </div>

            {activeTab === "os" ? (
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4">
                <ProcessManager />
                <MemoryVisualizer />
                <CPUScheduler />
                <ThreadVisualizer />
                <InterruptHandler />
                <SystemCallLog />
              </div>
            ) : (
              <LogPanel className="flex-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
