"use client";
import { motion } from "framer-motion";
import { useOSStore } from "@/store/osStore";

const STATE_COLORS: Record<string, string> = {
  RUNNING: "#22ff88",
  WAITING: "#00f0ff",
  BLOCKED: "#ff2288",
  READY: "#ff8844",
};

export default function ThreadVisualizer() {
  const { threads } = useOSStore();

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-orange" />
        Threads / Concurrency
      </h3>

      {threads.length === 0 ? (
        <div className="text-muted/40 text-center text-xs py-6">No threads created yet</div>
      ) : (
        <div className="space-y-2.5">
          {threads.map((t) => (
            <motion.div
              key={t.tid}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 hover:bg-white/5 transition-colors"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: STATE_COLORS[t.state],
                  boxShadow: `0 0 8px ${STATE_COLORS[t.state]}60`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground/90">{t.name}</span>
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      color: STATE_COLORS[t.state],
                      backgroundColor: `${STATE_COLORS[t.state]}15`,
                    }}
                  >
                    {t.state}
                  </span>
                </div>
                <span className="text-[9px] text-muted font-mono">TID {t.tid} • PID {t.processId}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Thread Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-white/5">
        {Object.entries(STATE_COLORS).map(([state, color]) => (
          <div key={state} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-muted">{state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
