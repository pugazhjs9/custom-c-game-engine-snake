"use client";

export default function NetworkVisualizer() {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-pink" />
        Networking (Multiplayer)
      </h3>

      {/* Packet Flow */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center">
          <div className="w-14 h-10 rounded-lg border border-neon-cyan/30 flex items-center justify-center text-[10px] font-mono text-neon-cyan bg-neon-cyan/5">
            Client
          </div>
        </div>
        <div className="flex-1 mx-3 relative">
          <div className="h-px bg-gradient-to-r from-neon-cyan/40 to-neon-pink/40" />
          <div className="absolute top-1 left-0 right-0 flex justify-between text-[8px] text-muted font-mono">
            <span>SYN →</span>
            <span>← ACK</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-14 h-10 rounded-lg border border-neon-pink/30 flex items-center justify-center text-[10px] font-mono text-neon-pink bg-neon-pink/5">
            Server
          </div>
        </div>
      </div>

      {/* WebSocket Info */}
      <div className="space-y-1.5 text-[10px] font-mono">
        <div className="px-2 py-1.5 rounded bg-white/3 flex justify-between">
          <span className="text-muted">Protocol</span>
          <span className="text-neon-cyan">WebSocket (ws://)</span>
        </div>
        <div className="px-2 py-1.5 rounded bg-white/3 flex justify-between">
          <span className="text-muted">Library</span>
          <span className="text-neon-purple">Socket.io v4</span>
        </div>
        <div className="px-2 py-1.5 rounded bg-white/3 flex justify-between">
          <span className="text-muted">Events</span>
          <span className="text-neon-green">game:update, player:move</span>
        </div>
        <div className="px-2 py-1.5 rounded bg-white/3 flex justify-between">
          <span className="text-muted">Status</span>
          <span className="text-muted/50">Connect in multiplayer mode</span>
        </div>
      </div>
    </div>
  );
}
