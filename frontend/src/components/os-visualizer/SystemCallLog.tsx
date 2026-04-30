"use client";
import { useLogStore } from "@/store/logStore";

export default function SystemCallLog() {
  const { logs } = useLogStore();
  const syscalls = logs.filter((l) => l.category === "syscall").slice(-15);

  const SYSCALL_TABLE = [
    { name: "read()", num: 0, desc: "Read keyboard input from STDIN" },
    { name: "write()", num: 1, desc: "Write to STDOUT (screen render)" },
    { name: "ioctl()", num: 54, desc: "Get terminal size (TIOCGWINSZ)" },
    { name: "tcsetattr()", num: 148, desc: "Set terminal raw mode" },
    { name: "tcgetattr()", num: 147, desc: "Get terminal attributes" },
    { name: "fcntl()", num: 92, desc: "Set non-blocking I/O" },
    { name: "usleep()", num: 35, desc: "Game tick delay" },
  ];

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-neon-orange" />
        System Calls
      </h3>

      {/* System Call Table */}
      <div className="mb-4">
        <span className="text-[10px] text-muted mb-2 block">Syscall Table (used by Snake engine)</span>
        <div className="space-y-1">
          {SYSCALL_TABLE.map((sc) => (
            <div key={sc.num} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded bg-white/3">
              <span className="text-neon-orange w-6 text-right">{sc.num}</span>
              <span className="text-neon-cyan w-20">{sc.name}</span>
              <span className="text-muted flex-1 truncate">{sc.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Syscall Log */}
      <div>
        <span className="text-[10px] text-muted mb-2 block">Live Syscalls</span>
        <div className="space-y-0.5 max-h-28 overflow-y-auto">
          {syscalls.length === 0 ? (
            <div className="text-muted/40 text-center text-[10px] py-3">Waiting...</div>
          ) : (
            syscalls.map((log) => (
              <div key={log.id} className="text-[10px] font-mono text-neon-orange/80 px-2 py-0.5">
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
