"use client";
import { motion } from "framer-motion";
import { useOSStore } from "@/store/osStore";

export default function MemoryVisualizer() {
  const { memoryBlocks, totalMemory, allocatedMemory } = useOSStore();

  const usagePercent = ((allocatedMemory / totalMemory) * 100).toFixed(1);
  const freeMemory = totalMemory - allocatedMemory;

  // Create visual grid representation
  const BLOCK_COUNT = 64;
  const blockSize = totalMemory / BLOCK_COUNT;
  const visualBlocks: { allocated: boolean; label?: string }[] = [];

  let offset = 0;
  for (const block of memoryBlocks) {
    const blockCount = Math.max(1, Math.round(block.size / blockSize));
    for (let i = 0; i < blockCount && visualBlocks.length < BLOCK_COUNT; i++) {
      visualBlocks.push({ allocated: !block.free, label: block.label });
    }
    offset += block.size;
  }
  while (visualBlocks.length < BLOCK_COUNT) {
    visualBlocks.push({ allocated: false });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-green" />
        Memory Management
      </h3>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-muted mb-1.5">
          <span>Pool: {(totalMemory / 1024).toFixed(0)} KB</span>
          <span>{usagePercent}% used</span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #22ff88, #00f0ff)" }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted mt-1">
          <span className="text-neon-green">Allocated: {allocatedMemory}B</span>
          <span className="text-muted">Free: {freeMemory}B</span>
        </div>
      </div>

      {/* Memory Grid */}
      <div className="mb-4">
        <span className="text-[10px] text-muted mb-2 block">Memory Pool (64 KB — {BLOCK_COUNT} blocks)</span>
        <div className="grid grid-cols-16 gap-0.5">
          {visualBlocks.map((block, i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-sm"
              animate={{
                backgroundColor: block.allocated ? "#22ff8880" : "#ffffff08",
                boxShadow: block.allocated ? "0 0 4px #22ff8840" : "none",
              }}
              transition={{ duration: 0.2 }}
              title={block.allocated ? `Block ${i}: allocated` : `Block ${i}: free`}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-neon-green/50" />
          <span className="text-muted">Allocated</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white/5" />
          <span className="text-muted">Free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-neon-orange/50" />
          <span className="text-muted">Header (12B)</span>
        </div>
      </div>

      {/* Block List */}
      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
        {memoryBlocks.slice(0, 10).map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded bg-white/3"
          >
            <span className={block.free ? "text-muted" : "text-neon-green"}>
              {block.free ? "FREE" : "ALLOC"}
            </span>
            <span className="text-muted">offset: 0x{block.offset.toString(16).padStart(4, "0")}</span>
            <span className="text-foreground/60">{block.size}B</span>
          </div>
        ))}
      </div>
    </div>
  );
}
