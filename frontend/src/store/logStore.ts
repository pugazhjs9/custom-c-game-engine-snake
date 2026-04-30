import { create } from "zustand";
import { LogEntry, OSEvent } from "@/engine/types";

interface LogStore {
  logs: LogEntry[];
  maxLogs: number;
  filters: Set<string>;
  addLog: (log: LogEntry) => void;
  addFromEvent: (event: OSEvent) => void;
  clearLogs: () => void;
  toggleFilter: (category: string) => void;
  setFilters: (filters: Set<string>) => void;
}

const eventToCategory = (type: string): LogEntry["category"] => {
  if (type.startsWith("CPU") || type === "FRAME_RENDERED") return "cpu";
  if (type.startsWith("MEMORY")) return "memory";
  if (type.startsWith("INPUT")) return "input";
  if (type.startsWith("NETWORK")) return "network";
  if (type.startsWith("PROCESS") || type.startsWith("THREAD")) return "process";
  if (type.startsWith("SYSCALL")) return "syscall";
  if (type.startsWith("FILE")) return "file";
  return "cpu";
};

const eventToMessage = (event: OSEvent): string => {
  const d = event.data;
  switch (event.type) {
    case "PROCESS_CREATED": return `Process created: ${d.name} (PID ${d.pid})`;
    case "PROCESS_TERMINATED": return `Process terminated: ${d.name} (exit ${d.exitCode})`;
    case "PROCESS_STATE_CHANGE": return `Process ${d.pid}: ${d.from} → ${d.to}`;
    case "MEMORY_ALLOCATED": return `malloc(${d.size}B) — ${d.cFunction}`;
    case "MEMORY_FREED": return `free(${d.size}B) — ${d.cFunction}`;
    case "CPU_TICK": return `CPU tick #${d.tick} [${d.timeSlice}ms quantum]`;
    case "THREAD_CREATED": return `Thread created: ${d.name} (TID ${d.tid})`;
    case "INPUT_INTERRUPT": return `IRQ1: key='${d.key}' — ${d.cFunction}`;
    case "SYSCALL": return `syscall: ${d.call}`;
    case "FILE_WRITE": return `write() — ${d.operation}`;
    case "FRAME_RENDERED": return `render frame #${d.tick} (${d.snakeLength} segments)`;
    default: return `${event.type}: ${JSON.stringify(d)}`;
  }
};

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  maxLogs: 200,
  filters: new Set(["cpu", "memory", "input", "network", "process", "syscall", "file", "render"]),
  addLog: (log) => set((state) => ({
    logs: [...state.logs.slice(-(state.maxLogs - 1)), log],
  })),
  addFromEvent: (event) => set((state) => {
    const log: LogEntry = {
      id: event.id,
      timestamp: event.timestamp,
      category: eventToCategory(event.type),
      message: eventToMessage(event),
      data: event.data,
    };
    return { logs: [...state.logs.slice(-(state.maxLogs - 1)), log] };
  }),
  clearLogs: () => set({ logs: [] }),
  toggleFilter: (category) => set((state) => {
    const next = new Set(state.filters);
    if (next.has(category)) next.delete(category); else next.add(category);
    return { filters: next };
  }),
  setFilters: (filters) => set({ filters }),
}));
