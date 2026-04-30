"use client";
import { motion } from "framer-motion";
import { useOSStore } from "@/store/osStore";

const STATE_COLORS: Record<string, string> = {
  NEW: "#ffdd00",
  READY: "#ff8844",
  RUNNING: "#22ff88",
  WAITING: "#00f0ff",
  TERMINATED: "#ff2288",
};

export default function ProcessManager() {
  const { processes } = useOSStore();

  const states = ["NEW", "READY", "RUNNING", "WAITING", "TERMINATED"];

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-purple" />
        Process Management
      </h3>

      {/* State Machine Diagram */}
      <div className="flex items-center justify-between mb-5 px-2">
        {states.map((state, i) => (
          <div key={state} className="flex items-center gap-1">
            <motion.div
              className="relative flex flex-col items-center"
              animate={{
                scale: processes.some((p) => p.state === state) ? [1, 1.1, 1] : 1,
              }}
              transition={{ repeat: processes.some((p) => p.state === state) ? Infinity : 0, duration: 1.5 }}
            >
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-[9px] font-bold font-mono"
                style={{
                  borderColor: STATE_COLORS[state],
                  color: STATE_COLORS[state],
                  backgroundColor: processes.some((p) => p.state === state)
                    ? `${STATE_COLORS[state]}20` : "transparent",
                  boxShadow: processes.some((p) => p.state === state)
                    ? `0 0 15px ${STATE_COLORS[state]}40` : "none",
                }}
              >
                {state.slice(0, 3)}
              </div>
              <span className="text-[8px] text-muted mt-1">{state}</span>
            </motion.div>
            {i < states.length - 1 && (
              <div className="w-4 h-px bg-white/20 mx-0.5" />
            )}
          </div>
        ))}
      </div>

      {/* PCB Table */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-muted px-2">
          <span>PID</span><span>NAME</span><span>STATE</span><span>PRIORITY</span><span>CPU</span>
        </div>
        {processes.length === 0 ? (
          <div className="text-muted/40 text-center text-xs py-4">No processes running</div>
        ) : (
          processes.map((p) => (
            <motion.div
              key={p.pid}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-5 gap-2 text-[11px] font-mono px-2 py-1.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors"
            >
              <span className="text-neon-cyan">{p.pid}</span>
              <span className="text-foreground/80 truncate">{p.name}</span>
              <span style={{ color: STATE_COLORS[p.state] }}>{p.state}</span>
              <span className="text-muted">{p.priority}</span>
              <span className="text-neon-orange">{p.cpuTime}ms</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
