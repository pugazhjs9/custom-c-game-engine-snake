"use client";

export default function DeadlockDemo() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-pink" />
        Deadlock / Race Condition
      </h3>

      {/* Resource Allocation Graph */}
      <div className="mb-4">
        <span className="text-[10px] text-muted mb-2 block">Resource Allocation Graph</span>
        <div className="flex items-center justify-center gap-6 py-3">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-neon-cyan flex items-center justify-center text-[9px] font-mono text-neon-cyan">P1</div>
            <span className="text-[8px] text-muted">Player 1</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[8px] text-neon-green">→ holds →</div>
            <div className="w-8 h-8 border-2 border-neon-orange flex items-center justify-center text-[8px] font-mono text-neon-orange">R1</div>
            <span className="text-[7px] text-muted">Game State</span>
            <div className="text-[8px] text-neon-pink">← waits ←</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-neon-purple flex items-center justify-center text-[9px] font-mono text-neon-purple">P2</div>
            <span className="text-[8px] text-muted">Player 2</span>
          </div>
        </div>
      </div>

      {/* Prevention Strategies */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-muted mb-1 block">Prevention Strategies</span>
        <div className="px-2 py-1.5 rounded bg-white/3 text-[10px]">
          <span className="text-neon-green font-semibold">Mutex Lock: </span>
          <span className="text-muted">Server-side game state mutex prevents concurrent writes</span>
        </div>
        <div className="px-2 py-1.5 rounded bg-white/3 text-[10px]">
          <span className="text-neon-cyan font-semibold">Event Queue: </span>
          <span className="text-muted">Socket.io serializes player actions via event queue</span>
        </div>
        <div className="px-2 py-1.5 rounded bg-white/3 text-[10px]">
          <span className="text-neon-purple font-semibold">Atomic Updates: </span>
          <span className="text-muted">Server tick processes all inputs atomically</span>
        </div>
      </div>
    </div>
  );
}
