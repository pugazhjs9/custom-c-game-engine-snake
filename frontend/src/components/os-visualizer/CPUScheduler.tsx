"use client";
import { useOSStore } from "@/store/osStore";
import { SchedulingAlgorithm } from "@/engine/types";

const ALG_LABELS: Record<SchedulingAlgorithm, string> = {
  FCFS: "First Come First Serve",
  RR: "Round Robin",
  PRIORITY: "Priority",
  SJF: "Shortest Job First",
};

const COLORS = ["#00f0ff", "#a855f7", "#22ff88", "#ff2288", "#ff8844", "#ffdd00"];

export default function CPUScheduler() {
  const { algorithm, setAlgorithm, scheduleHistory, cpuUsage } = useOSStore();

  const maxUsage = Math.max(...cpuUsage, 1);

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-cyan" />
        CPU Scheduling
      </h3>

      {/* Algorithm Selector */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(Object.keys(ALG_LABELS) as SchedulingAlgorithm[]).map((alg) => (
          <button
            key={alg}
            onClick={() => setAlgorithm(alg)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
              algorithm === alg
                ? "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10"
                : "text-muted border-white/5 hover:border-white/10"
            }`}
          >
            {alg}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted mb-3">{ALG_LABELS[algorithm]}</p>

      {/* Gantt Chart */}
      <div className="mb-4">
        <span className="text-[10px] text-muted mb-2 block">Gantt Chart</span>
        <div className="flex h-8 rounded-lg overflow-hidden border border-white/5">
          {scheduleHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted/40 text-[10px]">
              Waiting for scheduler...
            </div>
          ) : (
            scheduleHistory.slice(-20).map((entry, i) => {
              const width = Math.max(((entry.endTime - entry.startTime) / 10) * 100, 5);
              return (
                <div
                  key={i}
                  className="flex items-center justify-center text-[8px] font-mono font-bold text-white/90 shrink-0 border-r border-black/20"
                  style={{
                    backgroundColor: entry.color || COLORS[entry.pid % COLORS.length],
                    width: `${Math.min(width, 30)}%`,
                  }}
                  title={`P${entry.pid}: ${entry.startTime}-${entry.endTime}ms`}
                >
                  P{entry.pid}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CPU Usage Sparkline */}
      <div>
        <span className="text-[10px] text-muted mb-2 block">CPU Utilization</span>
        <div className="h-12 flex items-end gap-px rounded-lg overflow-hidden bg-white/3 p-1">
          {cpuUsage.slice(-40).map((val, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-150"
              style={{
                height: `${(val / maxUsage) * 100}%`,
                backgroundColor: val > 80 ? "#ff2288" : val > 50 ? "#ffdd00" : "#00f0ff",
                opacity: 0.6 + (i / 40) * 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
