"use client";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { GameStateEnum, Direction } from "@/engine/types";
import GameCanvas from "@/components/game/GameCanvas";
import GlassCard from "@/components/ui/GlassCard";
import GlowText from "@/components/ui/GlowText";
import NeonButton from "@/components/ui/NeonButton";
import { Users, Wifi, WifiOff, Plus, ArrowRight, Copy, Check, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServerPlayer {
  id: string;
  name: string;
  snake: Array<{ x: number; y: number }>;
  direction: string;
  score: number;
  level: number;
  alive: boolean;
  color: string;
}

type MenuStep = "name" | "choice" | "create" | "join";

export default function MultiplayerPage() {
  const [connected, setConnected] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [step, setStep] = useState<MenuStep>("name");
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [players, setPlayers] = useState<ServerPlayer[]>([]);
  const [myColor, setMyColor] = useState("#00f0ff");
  const [copied, setCopied] = useState(false);
  const [killedBy, setKilledBy] = useState<string | null>(null);
  const [myAlive, setMyAlive] = useState(true);
  const [myScore, setMyScore] = useState(0);

  // Construct a GameState object for GameCanvas from server data
  const [gameState, setGameState] = useState({
    snake: [{ x: 4, y: 4, id: 0 }],
    food: { x: 14, y: 14, type: "normal" as const },
    bonusFood: null,
    direction: Direction.RIGHT,
    nextDirection: Direction.RIGHT,
    score: 0,
    highScore: 0,
    state: GameStateEnum.PLAYING,
    level: 1,
    tickMs: 200,
    boardWidth: 28,
    boardHeight: 28,
    tickCount: 0,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => { setConnected(false); setInRoom(false); });

    socket.on("room:joined", ({ color, roomId }) => {
      setInRoom(true);
      setRoom(roomId);
      setMyColor(color);
      setKilledBy(null);
      setMyAlive(true);
    });

    // Server sends complete game state every tick (200ms)
    socket.on("game:state", (serverState: { players: ServerPlayer[]; food: { x: number; y: number }; tickCount: number }) => {
      setPlayers(serverState.players);
      const me = serverState.players.find(p => p.id === socket.id);
      if (me) {
        setMyScore(me.score);
        setMyAlive(me.alive);
        setGameState({
          snake: me.snake.map((seg, i) => ({ ...seg, id: i })),
          food: { ...serverState.food, type: "normal" as const },
          bonusFood: serverState.bonusFood ? { ...serverState.bonusFood, type: "bonus" as const } : null,
          direction: me.direction as Direction,
          nextDirection: me.direction as Direction,
          score: me.score,
          highScore: me.score,
          state: me.alive ? GameStateEnum.PLAYING : GameStateEnum.GAMEOVER,
          level: me.level,
          tickMs: 200,
          boardWidth: 28,
          boardHeight: 28,
          tickCount: serverState.tickCount,
          foodEatenCount: 0, // Not needed for rendering but kept for type sync
        });
      }
    });

    socket.on("players:update", (updatedPlayers: ServerPlayer[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on("server:you_died", ({ killedBy: killer, reason }: { killedBy: string | null; reason: string }) => {
      setKilledBy(killer || null);
      setMyAlive(false);
    });

    return () => { socket.disconnect(); };
  }, []);

  // Keyboard handler — sends direction to server only
  const handleInput = (e: React.KeyboardEvent) => {
    if (!socketRef.current || !myAlive) return;
    let dir: string | null = null;
    switch (e.key) {
      case "w": case "W": case "ArrowUp": dir = "UP"; break;
      case "s": case "S": case "ArrowDown": dir = "DOWN"; break;
      case "a": case "A": case "ArrowLeft": dir = "LEFT"; break;
      case "d": case "D": case "ArrowRight": dir = "RIGHT"; break;
    }
    if (dir) {
      e.preventDefault();
      socketRef.current.emit("player:direction", { direction: dir });
    }
  };

  const handleCreateRoom = () => {
    setRoom(Math.random().toString(36).substring(2, 8).toUpperCase());
    setStep("create");
  };

  const handleJoin = () => {
    if (!name || !room) return;
    socketRef.current?.emit("room:join", { name, room });
  };

  const handleRespawn = () => {
    socketRef.current?.emit("room:join", { name, room });
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(room);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ═══ LOBBY UI ═══
  if (!inRoom) {
    return (
      <div className="fixed inset-0 top-16 overflow-hidden flex flex-col items-center justify-center bg-slate-950/20 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <Users className="w-16 h-16 text-neon-purple mb-4 mx-auto" />
            <h1 className="text-3xl font-bold mb-2">Multiplayer <GlowText color="purple">Lobby</GlowText></h1>
            <div className="flex items-center justify-center gap-2 text-xs">
              {connected ? (
                <div className="flex items-center gap-1.5 text-neon-green"><Wifi className="w-3 h-3" /> Node Online</div>
              ) : (
                <div className="flex items-center gap-1.5 text-neon-pink"><WifiOff className="w-3 h-3" /> Node Offline</div>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "name" && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GlassCard className="p-8">
                  <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">Initialize User</h3>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Enter process name..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted/40 mb-6 focus:outline-none focus:border-neon-purple/50 transition-all shadow-inner"
                    autoFocus onKeyDown={(e) => e.key === "Enter" && name && setStep("choice")} />
                  <NeonButton variant="purple" className="w-full" onClick={() => setStep("choice")} disabled={!name}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </NeonButton>
                </GlassCard>
              </motion.div>
            )}

            {step === "choice" && (
              <motion.div key="choice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={handleCreateRoom} className="group relative p-6 rounded-2xl glass hover:bg-white/5 transition-all text-left border border-white/10 hover:border-neon-purple/50">
                    <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center mb-4 text-neon-purple group-hover:scale-110 transition-transform"><Plus className="w-6 h-6" /></div>
                    <h3 className="text-lg font-bold mb-1">Create New Room</h3>
                    <p className="text-xs text-muted">Initialize a private process space</p>
                  </button>
                  <button onClick={() => setStep("join")} className="group relative p-6 rounded-2xl glass hover:bg-white/5 transition-all text-left border border-white/10 hover:border-neon-cyan/50">
                    <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center mb-4 text-neon-cyan group-hover:scale-110 transition-transform"><ArrowRight className="w-6 h-6" /></div>
                    <h3 className="text-lg font-bold mb-1">Join Existing Room</h3>
                    <p className="text-xs text-muted">Attach to an active session ID</p>
                  </button>
                  <button onClick={() => setStep("name")} className="text-xs text-muted hover:text-white mt-2 transition-colors">← Back to name entry</button>
                </div>
              </motion.div>
            )}

            {step === "create" && (
              <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GlassCard className="p-8 text-center">
                  <h3 className="text-sm font-semibold text-muted mb-6 uppercase tracking-wider">Room Allocation Successful</h3>
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="bg-white/5 px-6 py-4 rounded-2xl border border-dashed border-white/20 font-mono text-2xl tracking-[0.3em] text-neon-purple">{room}</div>
                    <button onClick={handleCopyId} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-muted hover:text-white">
                      {copied ? <Check className="w-5 h-5 text-neon-green" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted mb-8">Share this unique ID with friends to join the session.</p>
                  <div className="flex gap-3">
                    <NeonButton variant="purple" className="flex-1" onClick={handleJoin} disabled={!connected}>Initialize Session</NeonButton>
                    <NeonButton variant="gradient" className="px-4" onClick={() => setStep("choice")}>Cancel</NeonButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {step === "join" && (
              <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GlassCard className="p-8">
                  <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider">Attach to Room</h3>
                  <input type="text" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())}
                    placeholder="Enter 6-char Room ID..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted/40 mb-6 font-mono tracking-widest text-center focus:outline-none focus:border-neon-cyan/50"
                    maxLength={6} autoFocus onKeyDown={(e) => e.key === "Enter" && room.length === 6 && handleJoin()} />
                  <div className="flex gap-3">
                    <NeonButton variant="cyan" className="flex-1" onClick={handleJoin} disabled={!connected || room.length < 3}>Join Session</NeonButton>
                    <NeonButton variant="gradient" className="px-4" onClick={() => setStep("choice")}>Back</NeonButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ═══ GAME UI ═══
  return (
    <div className="fixed inset-0 top-16 overflow-hidden flex flex-col bg-slate-950/20" onKeyDown={handleInput} tabIndex={0} autoFocus>
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            <h1 className="text-xl font-bold flex items-center gap-2">
              Lobby: <span className="bg-neon-purple/10 text-neon-purple px-2 py-0.5 rounded-lg text-sm font-mono border border-neon-purple/30">{room}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {players.map((p) => (
                <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                  style={{ backgroundColor: p.color }} title={p.name}>
                  {p.name[0].toUpperCase()}
                </motion.div>
              ))}
            </div>
            <span className="text-xs text-muted font-medium bg-white/5 px-2 py-1 rounded-md border border-white/5">{players.length} Players</span>
            <button onClick={() => setInRoom(false)} className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-neon-pink transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 min-h-0">
          <div className="space-y-4 flex flex-col">
            <div className="glass rounded-xl px-6 py-4 flex items-center justify-between border-white/5 shadow-lg">
              <div className="flex items-center gap-10">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Current Score</span>
                  <div className="text-3xl font-black font-mono leading-none mt-1" style={{ color: myColor }}>{myScore}</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Environment</span>
                  <div className="text-sm font-bold text-white/90 mt-1">Multiplayer v2.0</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${connected ? "bg-neon-green shadow-[0_0_8px_#39ff14]" : "bg-neon-pink"}`} />
                  <span className="font-mono">{connected ? "SOCKET_OPEN" : "SOCKET_CLOSED"}</span>
                </div>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 glass rounded-2xl overflow-hidden flex items-center justify-center bg-black/60 shadow-inner border-white/5">
              <GameCanvas
                gameState={gameState}
                cellSize={22}
                players={players}
                myId={socketRef.current?.id}
                className="max-h-full max-w-full w-auto h-auto object-contain p-2"
              />

              <AnimatePresence>
                {gameState.state === GameStateEnum.GAMEOVER && (
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl z-20"
                  >
                    <div className="w-20 h-20 bg-neon-pink/20 rounded-full flex items-center justify-center mb-4 border border-neon-pink/30 animate-pulse">
                      <WifiOff className="w-10 h-10 text-neon-pink" />
                    </div>
                    <h2 className="text-5xl font-black text-neon-pink mb-2 tracking-tighter">GAME OVER</h2>
                    {killedBy ? (
                      <p className="text-white/60 mb-8 font-medium">Crashed into <span className="text-neon-purple font-bold">{killedBy}</span>&apos;s process space</p>
                    ) : (
                      <p className="text-white/60 mb-8 font-medium">Self-collision or Segment Fault detected</p>
                    )}
                    <div className="flex gap-4">
                      <NeonButton variant="purple" size="lg" onClick={handleRespawn}>Respawn</NeonButton>
                      <NeonButton variant="gradient" size="lg" onClick={() => setInRoom(false)}>Exit Lobby</NeonButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="glass rounded-xl p-5 flex flex-col min-h-0 border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted">Leaderboard</h3>
              <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
              <AnimatePresence>
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${p.id === socketRef.current?.id ? "bg-white/10 border-white/20 shadow-lg" : "bg-white/5 border-white/5"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold w-4 ${i < 3 ? "text-neon-cyan" : "text-muted"}`}>{i + 1}</span>
                      <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}80` }} />
                      <span className="text-sm font-bold truncate max-w-[120px] text-white/90">{p.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black font-mono text-white leading-none">{p.score}</span>
                      <span className="text-[8px] text-muted uppercase tracking-tighter mt-1">{p.alive ? "ACTIVE" : "DEAD"}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="text-[9px] text-muted uppercase font-bold tracking-widest mb-3">Room Information</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Host</span>
                  <span className="text-white/80 font-medium truncate max-w-[150px]">{players[0]?.name || "None"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Tick Rate</span>
                  <span className="text-neon-green font-mono">200ms (Server)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Architecture</span>
                  <span className="text-neon-green font-mono">SERVER_AUTH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
