"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import GlowText from "@/components/ui/GlowText";
import { Trophy, Medal, Crown, Clock, Gamepad2, Bot, Users, RefreshCw, Loader2 } from "lucide-react";

interface LeaderboardEntry {
  id?: number;
  playername: string;
  score: number;
  mode: "solo" | "ai" | "multiplayer";
  level: number;
  duration: number;
  snakelength: number;
  createdat: string;
}

const MODE_ICONS: Record<string, typeof Gamepad2> = { solo: Gamepad2, ai: Bot, multiplayer: Users };
const MODE_COLORS: Record<string, string> = { solo: "text-neon-cyan", ai: "text-neon-purple", multiplayer: "text-neon-green" };

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "alltime">("alltime");
  const [modeFilter, setModeFilter] = useState<"all" | "solo" | "ai" | "multiplayer">("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      if (modeFilter !== "all") params.set("mode", modeFilter);
      const res = await fetch(`${API_URL}/api/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data);
    } catch (err: any) {
      console.error("Failed to fetch leaderboard:", err);
      setError("Could not connect to backend");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period, modeFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const top3 = entries.slice(0, 3);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Trophy className="w-10 h-10 text-neon-yellow mx-auto mb-3" />
          <h1 className="text-3xl font-bold mb-2">
            Leader<GlowText color="cyan">board</GlowText>
          </h1>
          <p className="text-muted text-sm">Top players across all game modes</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="flex gap-1 p-1 glass rounded-xl">
            {(["daily", "weekly", "alltime"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? "bg-neon-cyan/10 text-neon-cyan" : "text-muted hover:text-foreground"}`}>
                {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 glass rounded-xl">
            {(["all", "solo", "ai", "multiplayer"] as const).map((m) => (
              <button key={m} onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${modeFilter === m ? "bg-neon-purple/10 text-neon-purple" : "text-muted hover:text-foreground"}`}>
                {m === "all" ? "All Modes" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={fetchLeaderboard} disabled={loading}
            className="p-1.5 glass rounded-xl text-muted hover:text-neon-cyan transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Loading / Error / Empty states */}
        {loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-neon-cyan" />
            <p className="text-sm">Loading leaderboard...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <GlassCard className="inline-block !p-6">
              <p className="text-neon-pink text-sm font-semibold mb-2">⚠ {error}</p>
              <p className="text-muted text-xs">Make sure the backend is running: <code className="text-neon-cyan">cd backend && npm run dev</code></p>
            </GlassCard>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-16">
            <GlassCard className="inline-block !p-8">
              <Trophy className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-1">No scores yet</p>
              <p className="text-muted text-xs">Play a game to claim the #1 spot!</p>
            </GlassCard>
          </div>
        )}

        {/* Top 3 Podium */}
        {top3.length >= 2 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {[top3[1], top3[0], top3[2]].map((entry, i) => {
              if (!entry) return <div key={i} className="w-28" />;
              const heights = ["h-28", "h-36", "h-24"];
              const icons = [Medal, Crown, Medal];
              const colors = ["text-gray-400", "text-neon-yellow", "text-amber-600"];
              const Icon = icons[i];
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
              return (
                <motion.div key={entry.playername + rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                  <GlassCard className="!p-3 w-28 sm:w-32 text-center">
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${colors[i]}`} />
                    <div className="text-xs font-bold text-foreground truncate">{entry.playername}</div>
                    <div className="text-lg font-bold text-neon-cyan font-mono">{entry.score.toLocaleString()}</div>
                    <div className={`${heights[i]} mt-2 rounded-t-lg bg-gradient-to-t from-neon-cyan/10 to-transparent flex items-end justify-center pb-2`}>
                      <span className="text-2xl font-bold text-muted/30">#{rank}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full Table */}
        {entries.length > 0 && (
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-muted uppercase border-b border-white/5">
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Player</th>
                    <th className="px-3 py-2 text-left">Score</th>
                    <th className="px-3 py-2 text-left">Mode</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">Level</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">Length</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const mode = entry.mode || "solo";
                    const ModeIcon = MODE_ICONS[mode] || Gamepad2;
                    const modeColor = MODE_COLORS[mode] || "text-muted";
                    return (
                      <motion.tr key={entry.id || `${entry.playername}-${i}`}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-white/3 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5">
                          <span className={`font-mono font-bold ${i < 3 ? "text-neon-yellow" : "text-muted"}`}>
                            #{i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{entry.playername}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-neon-cyan">{entry.score.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <span className={`flex items-center gap-1.5 text-xs ${modeColor}`}>
                            <ModeIcon className="w-3 h-3" /> {mode}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted text-xs hidden sm:table-cell font-mono">
                          Lv.{entry.level || 1}
                        </td>
                        <td className="px-3 py-2.5 text-muted text-xs hidden sm:table-cell font-mono">
                          {entry.snakelength || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted text-xs hidden sm:table-cell">
                          {formatDate(entry.createdat)}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-center py-3 border-t border-white/5">
              <p className="text-[10px] text-muted">
                Live data from PostgreSQL • Auto-refreshes every 15s • Showing top {entries.length} scores
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
