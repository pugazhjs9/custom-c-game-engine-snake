"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InterruptEntry {
  key: string;
  irq: number;
  timestamp: number;
}

export default function InterruptHandler() {
  const [interrupts, setInterrupts] = useState<InterruptEntry[]>([]);

  // This is populated via OS event hook in the game pages
  // We expose a way to add entries
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-yellow" />
        Keyboard Interrupts
      </h3>

      {/* Interrupt Flow Diagram */}
      <div className="flex items-center justify-between text-[9px] font-mono text-muted mb-4 px-1">
        <div className="flex flex-col items-center">
          <div className="w-12 h-8 rounded border border-neon-yellow/30 flex items-center justify-center text-neon-yellow bg-neon-yellow/5">
            HW
          </div>
          <span className="mt-1">Keyboard</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-neon-yellow/30 to-neon-cyan/30 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-12 h-8 rounded border border-neon-orange/30 flex items-center justify-center text-neon-orange bg-neon-orange/5">
            IRQ1
          </div>
          <span className="mt-1">Interrupt</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-neon-orange/30 to-neon-purple/30 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-12 h-8 rounded border border-neon-purple/30 flex items-center justify-center text-neon-purple bg-neon-purple/5">
            ISR
          </div>
          <span className="mt-1">Handler</span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-neon-purple/30 to-neon-green/30 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-12 h-8 rounded border border-neon-green/30 flex items-center justify-center text-neon-green bg-neon-green/5">
            APP
          </div>
          <span className="mt-1">Game Loop</span>
        </div>
      </div>

      {/* Interrupt Vector Table */}
      <div className="mt-3">
        <span className="text-[10px] text-muted mb-2 block">Interrupt Vector Table</span>
        <div className="space-y-1 font-mono text-[10px]">
          <div className="flex justify-between px-2 py-1 rounded bg-white/3">
            <span className="text-neon-yellow">IRQ 0</span>
            <span className="text-muted">Timer — game tick (usleep)</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-white/3">
            <span className="text-neon-cyan">IRQ 1</span>
            <span className="text-muted">Keyboard — read(STDIN)</span>
          </div>
          <div className="flex justify-between px-2 py-1 rounded bg-white/3">
            <span className="text-neon-purple">IRQ 28</span>
            <span className="text-muted">SIGWINCH — terminal resize</span>
          </div>
        </div>
      </div>
    </div>
  );
}
