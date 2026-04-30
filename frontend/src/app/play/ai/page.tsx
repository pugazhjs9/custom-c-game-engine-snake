"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { SnakeEngine } from "@/engine/SnakeEngine";
import { AIEngine } from "@/engine/AIEngine";
import { GameState, GameStateEnum, Direction, Segment } from "@/engine/types";
import { useLogStore } from "@/store/logStore";
import { usePlayerStore } from "@/store/playerStore";
import GameCanvas from "@/components/game/GameCanvas";
import LogPanel from "@/components/logs/LogPanel";
import NeonButton from "@/components/ui/NeonButton";
import GlassCard from "@/components/ui/GlassCard";
import GlowText from "@/components/ui/GlowText";
import { Bot, RotateCcw, ArrowRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function AIGamePage() {
  const engineRef = useRef<SnakeEngine | null>(null);
  const aiEngineRef = useRef<AIEngine | null>(null);
  const aiSnakeRef = useRef<Segment[]>([]);
  const aiDirRef = useRef<Direction>(Direction.LEFT);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiSnake, setAiSnake] = useState<Segment[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [aiScore, setAiScore] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const addFromEvent = useLogStore((s) => s.addFromEvent);

  // Player name
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
          mode: "ai",
          level: engine.state.level,
          duration,
          snakeLength: engine.state.snake.length,
        }),
      });
    } catch (err) {
      console.error("Failed to save score:", err);
    }
  }, [playerName, scoreSaved]);

  const initGame = useCallback(() => {
    if (engineRef.current) engineRef.current.destroy();
    useLogStore.getState().clearLogs();
    setScoreSaved(false);
    startTimeRef.current = Date.now();

    const engine = new SnakeEngine({ boardWidth: 28, boardHeight: 28, cellSize: 22 });
    const ai = new AIEngine(28, 28);

    // Initialize AI snake
    const aiInitSnake: Segment[] = [];
    for (let i = 0; i < 4; i++) {
      aiInitSnake.push({ x: 20 + i, y: 14, id: 1000 + i });
    }
    aiSnakeRef.current = aiInitSnake;
    aiDirRef.current = Direction.LEFT;
    setAiScore(0);

    engine.onAny(addFromEvent);

    // Save score on game over
    engine.on("PROCESS_TERMINATED", () => {
      saveScore(engine);
    });

    engineRef.current = engine;
    aiEngineRef.current = ai;
    engine.init();
    setGameState({ ...engine.state });
    setAiSnake([...aiInitSnake]);

    // AI update loop
    const aiLoop = setInterval(() => {
      if (!engineRef.current || engineRef.current.state.state !== GameStateEnum.PLAYING) return;
      const normalFood = engineRef.current.state.food;
      const bonusFood = engineRef.current.state.bonusFood;
      
      let targetFood = normalFood;
      if (bonusFood) {
        const head = aiSnakeRef.current[0];
        const distNormal = Math.abs(head.x - normalFood.x) + Math.abs(head.y - normalFood.y);
        const distBonus = Math.abs(head.x - bonusFood.x) + Math.abs(head.y - bonusFood.y);
        
        // Prioritize bonus food if it's closer or reasonably close
        if (distBonus < distNormal + 10) {
          targetFood = bonusFood;
        }
      }

      const aiDir = ai.getNextDirection(aiSnakeRef.current, targetFood, aiDirRef.current, difficulty);
      aiDirRef.current = aiDir;

      // Move AI snake
      const head = aiSnakeRef.current[0];
      let nx = head.x, ny = head.y;
      switch (aiDir) {
        case Direction.UP: ny--; break;
        case Direction.DOWN: ny++; break;
        case Direction.LEFT: nx--; break;
        case Direction.RIGHT: nx++; break;
      }
      if (nx < 0) nx = 27; if (nx >= 28) nx = 0;
      if (ny < 0) ny = 27; if (ny >= 28) ny = 0;

      aiSnakeRef.current.unshift({ x: nx, y: ny, id: Date.now() });
      if (nx === normalFood.x && ny === normalFood.y) {
        setAiScore((s) => s + 10);
      } else if (bonusFood && nx === bonusFood.x && ny === bonusFood.y) {
        setAiScore((s) => s + 50);
        // Bonus food is handled by engine logic, but AI needs to know it's gone
      } else {
        aiSnakeRef.current.pop();
      }
      setAiSnake([...aiSnakeRef.current]);
    }, 150);

    // Render loop
    const renderLoop = setInterval(() => {
      if (engineRef.current) setGameState({ ...engineRef.current.state });
    }, 50);

    // Collision check loop (Player vs AI)
    const collisionLoop = setInterval(() => {
      if (!engineRef.current || engineRef.current.state.state !== GameStateEnum.PLAYING) return;
      
      const head = engineRef.current.state.snake[0];
      // Check if player head hits AI body
      if (aiSnakeRef.current.some(seg => seg.x === head.x && seg.y === head.y)) {
        engineRef.current.gameOver();
        addFromEvent({
          id: `collision-${Date.now()}`,
          type: "SYSCALL",
          timestamp: Date.now(),
          data: { call: "SIGSEGV", description: "Memory access violation: Collided with AI process segment" },
          source: "OS_KERNEL"
        });
      }

      // Check if AI head hits player body
      const aiHead = aiSnakeRef.current[0];
      if (engineRef.current.state.snake.some(seg => seg.x === aiHead.x && seg.y === aiHead.y)) {
        engineRef.current.gameOver();
      }
    }, 50);

    engine.start();

    return () => { 
      clearInterval(aiLoop); 
      clearInterval(renderLoop); 
      clearInterval(collisionLoop); 
    };
  }, [difficulty, addFromEvent, saveScore]);

  useEffect(() => {
    if (!nameSet) return;
    const cleanup = initGame();
    const handleKey = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) {
        e.preventDefault();
        engineRef.current?.handleInput(e.key);
      }
      if (e.key === "r" || e.key === "R") engineRef.current?.handleInput(e.key);
    };
    window.addEventListener("keydown", handleKey);
    return () => { cleanup(); window.removeEventListener("keydown", handleKey); engineRef.current?.destroy(); };
  }, [initGame, nameSet]);

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
            <Bot className="w-16 h-16 text-neon-purple mb-4 mx-auto" />
            <h1 className="text-3xl font-bold mb-2">AI <GlowText color="purple">Mode</GlowText></h1>
            <p className="text-muted text-sm">Your scores will be saved to the leaderboard</p>
          </div>
          <GlassCard className="p-8">
            <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">Initialize Player</h3>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted/40 mb-6 focus:outline-none focus:border-neon-purple/50 transition-all shadow-inner"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            />
            <NeonButton variant="purple" className="w-full" onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              Start Game <ArrowRight className="w-4 h-4 ml-2" />
            </NeonButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (!gameState) return null;
  const isGameOver = gameState.state === GameStateEnum.GAMEOVER;

  return (
    <div className="fixed inset-0 top-16 overflow-hidden flex flex-col bg-slate-950/20">
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-neon-purple" />
            <h1 className="text-xl font-bold">AI <GlowText color="purple">Mode</GlowText></h1>
            <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded-md border border-white/5">{playerName}</span>
          </div>
          <div className="flex items-center gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${difficulty === d ? "text-neon-purple border-neon-purple/30 bg-neon-purple/10" : "text-muted border-white/5"}`}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
            <NeonButton variant="purple" size="sm" onClick={() => initGame()}><RotateCcw className="w-4 h-4" /></NeonButton>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 min-h-0">
          <div className="space-y-4">
            {/* Score comparison */}
            <div className="glass rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted uppercase">You</span>
                <div className="text-2xl font-bold text-neon-cyan font-mono">{gameState.score}</div>
              </div>
              <span className="text-lg font-bold text-muted">VS</span>
              <div className="text-right">
                <span className="text-[10px] text-muted uppercase">AI ({difficulty})</span>
                <div className="text-2xl font-bold text-neon-purple font-mono">{aiScore}</div>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 glass rounded-2xl overflow-hidden flex items-center justify-center bg-black/40 shadow-2xl">
              <GameCanvas gameState={gameState} cellSize={22} aiSnake={aiSnake} className="max-h-full max-w-full w-auto h-auto object-contain" />
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
                    <div className="flex gap-4 mb-8">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 backdrop-blur-md">
                        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Your Score</p>
                        <div className="text-3xl font-black text-neon-cyan font-mono">{gameState.score}</div>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 backdrop-blur-md">
                        <p className="text-[10px] text-muted uppercase tracking-widest mb-1">AI Score</p>
                        <div className="text-3xl font-black text-neon-purple font-mono">{aiScore}</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted/60 mb-8">{scoreSaved ? "✓ Data committed to leaderboard" : "Committing data..."}</p>
                    <NeonButton variant="cyan" size="lg" onClick={() => initGame()}>Restart Process</NeonButton>
                  </motion.div>
                </motion.div>
              )}
            </div>

            <div className="glass rounded-xl px-5 py-3 flex gap-4 text-xs text-muted">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-neon-cyan" /> You</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-neon-purple" /> AI</div>
              <span className="ml-auto">AI uses {difficulty === "hard" ? "A* Pathfinding" : difficulty === "medium" ? "Greedy" : "Random"}</span>
            </div>
          </div>

          <LogPanel className="flex-1" />
        </div>
      </div>
    </div>
  );
}
