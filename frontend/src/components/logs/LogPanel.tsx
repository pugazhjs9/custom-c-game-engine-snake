"use client";
import { useEffect, useRef } from "react";
import { useLogStore } from "@/store/logStore";
import { cn } from "@/lib/utils";
import { Filter, Trash2, Download } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  cpu: "log-cpu",
  memory: "log-memory",
  input: "log-input",
  network: "log-network",
  process: "log-process",
  syscall: "log-syscall",
  file: "log-file",
  render: "log-cpu",
};

const CATEGORY_LABELS: Record<string, string> = {
  cpu: "CPU",
  memory: "MEM",
  input: "INPUT",
  network: "NET",
  process: "PROC",
  syscall: "SYS",
  file: "FILE",
  render: "RENDER",
};

export default function LogPanel({ className }: { className?: string }) {
  const { logs, filters, toggleFilter, clearLogs } = useLogStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => filters.has(log.category));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
  };

  return (
    <div className={cn("glass rounded-2xl flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-sm font-semibold text-foreground">System Logs</span>
          <span className="text-xs text-muted">({filteredLogs.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearLogs} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-foreground transition-colors" title="Clear logs">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-white/5">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleFilter(key)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all border",
              filters.has(key)
                ? `${CATEGORY_COLORS[key]} border-current/30 bg-current/10`
                : "text-muted/40 border-transparent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Log Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono text-[11px] min-h-0" style={{ maxHeight: 400 }}>
        {filteredLogs.length === 0 ? (
          <div className="text-muted/50 text-center py-8">Waiting for events...</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-2 py-0.5 hover:bg-white/3 rounded px-1 transition-colors">
              <span className="text-muted/50 shrink-0">{formatTime(log.timestamp)}</span>
              <span className={cn("shrink-0 font-bold w-[46px]", CATEGORY_COLORS[log.category])}>
                [{CATEGORY_LABELS[log.category] || log.category.toUpperCase()}]
              </span>
              <span className="text-foreground/80 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
