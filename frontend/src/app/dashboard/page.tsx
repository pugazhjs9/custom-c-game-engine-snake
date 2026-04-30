"use client";
import { useOSStore } from "@/store/osStore";
import GlassCard from "@/components/ui/GlassCard";
import GlowText from "@/components/ui/GlowText";
import { BarChart3, Cpu, MemoryStick, Users, Activity } from "lucide-react";

export default function DashboardPage() {
  const { cpuUsage, fpsHistory, fps, allocatedMemory, totalMemory, processes, threads } = useOSStore();
  const avgCpu = cpuUsage.length > 0 ? (cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length).toFixed(1) : "0.0";
  const memPercent = ((allocatedMemory / totalMemory) * 100).toFixed(1);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-neon-cyan" />
          <h1 className="text-xl font-bold">System <GlowText color="cyan">Dashboard</GlowText></h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Cpu, label: "CPU Usage", value: `${avgCpu}%`, color: "text-neon-cyan" },
            { icon: Activity, label: "FPS", value: `${fps || 0}`, color: "text-neon-green" },
            { icon: MemoryStick, label: "Memory", value: `${memPercent}%`, color: "text-neon-purple" },
            { icon: Users, label: "Threads", value: `${threads.length}`, color: "text-neon-orange" },
          ].map((stat) => (
            <GlassCard key={stat.label} className="!p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-[10px] text-muted uppercase">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-neon-cyan" /> CPU Usage Over Time
            </h3>
            <div className="h-40 flex items-end gap-px rounded-lg bg-white/3 p-2">
              {(cpuUsage.length > 0 ? cpuUsage : Array(60).fill(0)).slice(-60).map((val, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all" style={{ height: `${Math.max(val, 2)}%`, backgroundColor: val > 80 ? "#ff2288" : val > 50 ? "#ffdd00" : "#00f0ff", opacity: 0.5 + (i / 60) * 0.5 }} />
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-neon-purple" /> Memory Pool
            </h3>
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-muted mb-1">
                <span>Allocated</span><span>{allocatedMemory} / {totalMemory} bytes</span>
              </div>
              <div className="h-6 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${memPercent}%`, background: "linear-gradient(90deg, #a855f7, #00f0ff)" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/3 rounded-lg py-2"><div className="text-lg font-bold text-neon-purple font-mono">{allocatedMemory}</div><div className="text-[9px] text-muted">Used (B)</div></div>
              <div className="bg-white/3 rounded-lg py-2"><div className="text-lg font-bold text-neon-green font-mono">{totalMemory - allocatedMemory}</div><div className="text-[9px] text-muted">Free (B)</div></div>
              <div className="bg-white/3 rounded-lg py-2"><div className="text-lg font-bold text-neon-cyan font-mono">64</div><div className="text-[9px] text-muted">Pool (KB)</div></div>
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-neon-orange" /> Active Processes & Threads
            </h3>
            {processes.length === 0 && threads.length === 0 ? (
              <p className="text-muted/40 text-center text-xs py-8">Start a game to see active processes</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {processes.map((p) => (
                  <div key={p.pid} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                    <span>{p.name}</span><span className="font-mono text-neon-cyan">PID {p.pid}</span>
                    <span className={p.state === "RUNNING" ? "text-neon-green" : "text-neon-pink"}>{p.state}</span>
                  </div>
                ))}
                {threads.map((t) => (
                  <div key={t.tid} className="flex items-center justify-between text-xs bg-white/3 rounded-lg px-3 py-2">
                    <span>{t.name}</span><span className="font-mono text-neon-purple">TID {t.tid}</span>
                    <span className={t.state === "RUNNING" ? "text-neon-green" : "text-neon-yellow"}>{t.state}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
