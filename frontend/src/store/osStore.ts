import { create } from "zustand";
import { MemoryBlock, Process, Thread, ScheduleEntry, SchedulingAlgorithm } from "@/engine/types";

interface OSStore {
  /* Process */
  processes: Process[];
  /* Memory */
  memoryBlocks: MemoryBlock[];
  totalMemory: number;
  allocatedMemory: number;
  /* Threads */
  threads: Thread[];
  /* CPU Scheduler */
  algorithm: SchedulingAlgorithm;
  scheduleHistory: ScheduleEntry[];
  cpuUsage: number[];
  /* FPS */
  fps: number;
  fpsHistory: number[];
  /* Actions */
  addProcess: (p: Process) => void;
  updateProcess: (pid: number, state: Process["state"]) => void;
  removeProcess: (pid: number) => void;
  allocateMemory: (block: MemoryBlock) => void;
  freeMemory: (id: number) => void;
  setMemoryBlocks: (blocks: MemoryBlock[]) => void;
  addThread: (t: Thread) => void;
  updateThread: (tid: number, state: Thread["state"]) => void;
  setAlgorithm: (alg: SchedulingAlgorithm) => void;
  addScheduleEntry: (entry: ScheduleEntry) => void;
  pushCpuUsage: (value: number) => void;
  setFps: (fps: number) => void;
  reset: () => void;
}

const INITIAL_MEMORY: MemoryBlock[] = [
  { id: 0, offset: 0, size: 65536, free: true },
];

export const useOSStore = create<OSStore>((set) => ({
  processes: [],
  memoryBlocks: INITIAL_MEMORY,
  totalMemory: 65536,
  allocatedMemory: 0,
  threads: [],
  algorithm: "RR",
  scheduleHistory: [],
  cpuUsage: [],
  fps: 0,
  fpsHistory: [],

  addProcess: (p) => set((s) => ({ processes: [...s.processes, p] })),
  updateProcess: (pid, state) => set((s) => ({
    processes: s.processes.map((p) => p.pid === pid ? { ...p, state } : p),
  })),
  removeProcess: (pid) => set((s) => ({
    processes: s.processes.filter((p) => p.pid !== pid),
  })),
  allocateMemory: (block) => set((s) => {
    const blocks = [...s.memoryBlocks];
    const freeIdx = blocks.findIndex((b) => b.free && b.size >= block.size);
    if (freeIdx === -1) return s;
    const freeBlock = blocks[freeIdx];
    const newAllocated: MemoryBlock = { ...block, offset: freeBlock.offset, free: false };
    const remaining = freeBlock.size - block.size - 12;
    if (remaining > 0) {
      const newFree: MemoryBlock = {
        id: Date.now(), offset: freeBlock.offset + block.size + 12,
        size: remaining, free: true,
      };
      blocks.splice(freeIdx, 1, newAllocated, newFree);
    } else {
      blocks.splice(freeIdx, 1, newAllocated);
    }
    return { memoryBlocks: blocks, allocatedMemory: s.allocatedMemory + block.size };
  }),
  freeMemory: (id) => set((s) => {
    const blocks = s.memoryBlocks.map((b) => b.id === id ? { ...b, free: true } : b);
    // Merge adjacent free blocks
    const merged: MemoryBlock[] = [];
    for (const b of blocks) {
      if (merged.length > 0 && merged[merged.length - 1].free && b.free) {
        merged[merged.length - 1].size += b.size + 12;
      } else {
        merged.push({ ...b });
      }
    }
    const freed = s.memoryBlocks.find((b) => b.id === id);
    return { memoryBlocks: merged, allocatedMemory: s.allocatedMemory - (freed?.size || 0) };
  }),
  setMemoryBlocks: (blocks) => set({ memoryBlocks: blocks }),
  addThread: (t) => set((s) => ({ threads: [...s.threads, t] })),
  updateThread: (tid, state) => set((s) => ({
    threads: s.threads.map((t) => t.tid === tid ? { ...t, state } : t),
  })),
  setAlgorithm: (algorithm) => set({ algorithm }),
  addScheduleEntry: (entry) => set((s) => ({
    scheduleHistory: [...s.scheduleHistory.slice(-50), entry],
  })),
  pushCpuUsage: (value) => set((s) => ({
    cpuUsage: [...s.cpuUsage.slice(-60), value],
  })),
  setFps: (fps) => set((s) => ({
    fps, fpsHistory: [...s.fpsHistory.slice(-60), fps],
  })),
  reset: () => set({
    processes: [], memoryBlocks: INITIAL_MEMORY, allocatedMemory: 0,
    threads: [], scheduleHistory: [], cpuUsage: [], fps: 0, fpsHistory: [],
  }),
}));
