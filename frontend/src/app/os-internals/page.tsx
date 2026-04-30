"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlowText from "@/components/ui/GlowText";
import ProcessManager from "@/components/os-visualizer/ProcessManager";
import CPUScheduler from "@/components/os-visualizer/CPUScheduler";
import MemoryVisualizer from "@/components/os-visualizer/MemoryVisualizer";
import ThreadVisualizer from "@/components/os-visualizer/ThreadVisualizer";
import InterruptHandler from "@/components/os-visualizer/InterruptHandler";
import SystemCallLog from "@/components/os-visualizer/SystemCallLog";
import NetworkVisualizer from "@/components/os-visualizer/NetworkVisualizer";
import DeadlockDemo from "@/components/os-visualizer/DeadlockDemo";
import GlassCard from "@/components/ui/GlassCard";
import { Cpu, MemoryStick, Layers, Keyboard, FileText, Network, AlertTriangle, Zap } from "lucide-react";

const TABS = [
  { id: "process", label: "Process", icon: Cpu, color: "#a855f7" },
  { id: "cpu", label: "CPU", icon: Zap, color: "#00f0ff" },
  { id: "memory", label: "Memory", icon: MemoryStick, color: "#22ff88" },
  { id: "threads", label: "Threads", icon: Layers, color: "#ff8844" },
  { id: "interrupts", label: "Interrupts", icon: Keyboard, color: "#ffdd00" },
  { id: "syscalls", label: "Syscalls", icon: FileText, color: "#ff8844" },
  { id: "network", label: "Network", icon: Network, color: "#ff2288" },
  { id: "deadlock", label: "Deadlock", icon: AlertTriangle, color: "#ff2288" },
];

const CONCEPT_DETAILS: Record<string, { title: string; description: string; cCode: string }> = {
  process: {
    title: "Process Management",
    description: "The snake game runs as a process with states: NEW → READY → RUNNING → WAITING → TERMINATED. The game_init() creates the process, the main loop keeps it RUNNING, waiting for input puts it in WAITING, and game_cleanup() terminates it.",
    cCode: `// Process creation (game_init)
Game game;
mem_init();        // Initialize memory pool
kb_init();         // Set up I/O
game_init(&game);  // Create game process

// Process termination (cleanup)
game_cleanup(&game);
kb_cleanup();
screen_cleanup();`,
  },
  cpu: {
    title: "CPU Scheduling",
    description: "The game loop simulates CPU scheduling. Each tick is a time quantum. The main loop processes input (I/O bound), updates game state (CPU bound), and renders (I/O bound). Round Robin scheduling alternates between these tasks.",
    cCode: `// Game loop = CPU scheduler
while (1) {
    // Time slice 1: I/O (input)
    while (keyPressed()) {
        char key = readKey();
        game_handle_input(&game, key);
    }
    // Time slice 2: CPU (update)
    if (game.state == STATE_PLAYING)
        game_update(&game);
    // Time slice 3: I/O (render)
    game_render(&game);
    // Context switch delay
    usleep(sleep_chunk);
}`,
  },
  memory: {
    title: "Memory Management",
    description: "The C engine uses a custom 64KB pool allocator. Each snake segment is dynamically allocated with mem_alloc() (first-fit) and freed with mem_free() (with block coalescing). This mirrors how OS memory management works with malloc/free.",
    cCode: `// Pool: 64KB static array
static char pool[65536];

// Allocate segment (first-fit)
Segment *new = (Segment*)mem_alloc(sizeof(Segment));
new->x = nx; new->y = ny;
new->next = game->head;
game->head = new;

// Free tail segment
mem_free(game->tail);  // Marks block free
merge_free();          // Coalesce adjacent blocks`,
  },
  threads: {
    title: "Threads & Concurrency",
    description: "The game conceptually runs multiple threads: Main Loop (game tick), Input Handler (keyboard polling), Renderer (screen output), and Network Thread (multiplayer). In the C engine, these are sequential but mapped to thread concepts.",
    cCode: `// Thread 1: Input Handler
while (keyPressed()) {
    char key = readKey();  // Non-blocking read
    game_handle_input(&game, key);
}
// Thread 2: Game Logic
game_update(&game);
// Thread 3: Renderer
game_render(&game);
screen_flush();  // fflush(stdout)`,
  },
  interrupts: {
    title: "Keyboard Interrupts",
    description: "Key presses generate hardware interrupts (IRQ1). The keyboard controller sends a scan code, the CPU pauses the current task, executes the Interrupt Service Routine (ISR), and returns. In our C engine, read(STDIN) captures this.",
    cCode: `// Interrupt handler (keyboard.c)
int keyPressed(void) {
    if (last_key != 0) return 1;
    // read() = syscall that checks for interrupt
    if (read(STDIN_FILENO, &last_key, 1) > 0)
        return 1;
    return 0;
}

// Arrow key = multi-byte escape sequence
// ESC [ A = Up  (IRQ → ISR → decode)`,
  },
  syscalls: {
    title: "System Calls",
    description: "The game engine uses POSIX system calls: read() for input, write() for output (via printf), ioctl() for terminal dimensions, tcsetattr() for raw mode, fcntl() for non-blocking I/O, and usleep() for timing.",
    cCode: `// Key system calls used
read(STDIN_FILENO, &key, 1);     // Read input
write(STDOUT_FILENO, buf, len);  // Screen output
ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws); // Terminal size
tcsetattr(STDIN, TCSAFLUSH, &raw);     // Raw mode
fcntl(STDIN, F_SETFL, O_NONBLOCK);     // Non-blocking
usleep(10000);                          // 10ms sleep`,
  },
  network: {
    title: "Networking",
    description: "Multiplayer mode uses WebSocket (Socket.io) for real-time bidirectional communication. This demonstrates TCP connections, packet serialization, and the client-server model.",
    cCode: `// WebSocket connection (Socket.io)
const socket = io("ws://server:3001");

// Send player position
socket.emit("player:move", {
    direction: "UP",
    position: { x: 10, y: 15 }
});

// Receive game state update
socket.on("game:update", (state) => {
    renderAllPlayers(state.players);
});`,
  },
  deadlock: {
    title: "Deadlock & Race Conditions",
    description: "In multiplayer, two players might try to update the same cell simultaneously (race condition). The server prevents this with mutex-like locking — processing all inputs atomically per tick. Deadlock is prevented by ordering resource acquisition.",
    cCode: `// Race condition example:
// Player1: move to (5,3)  ← simultaneous
// Player2: move to (5,3)  ← conflict!

// Prevention: Server-side mutex
mutex_lock(&game_state_lock);
for (player in players) {
    process_input(player);
}
update_game_state();
mutex_unlock(&game_state_lock);
// All inputs processed atomically`,
  },
};

export default function OSInternalsPage() {
  const [activeTab, setActiveTab] = useState("process");
  const concept = CONCEPT_DETAILS[activeTab];

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            OS <GlowText color="purple">Internals</GlowText>
          </h1>
          <p className="text-muted text-sm">Explore how Operating System concepts power the Snake game engine</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                activeTab === tab.id
                  ? "border-current bg-current/10"
                  : "text-muted border-white/5 hover:border-white/10 hover:text-foreground"
              }`}
              style={activeTab === tab.id ? { color: tab.color } : undefined}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {/* Visualizer */}
            <div>
              {activeTab === "process" && <ProcessManager />}
              {activeTab === "cpu" && <CPUScheduler />}
              {activeTab === "memory" && <MemoryVisualizer />}
              {activeTab === "threads" && <ThreadVisualizer />}
              {activeTab === "interrupts" && <InterruptHandler />}
              {activeTab === "syscalls" && <SystemCallLog />}
              {activeTab === "network" && <NetworkVisualizer />}
              {activeTab === "deadlock" && <DeadlockDemo />}
            </div>

            {/* Explanation + Code */}
            <div className="space-y-4">
              <GlassCard>
                <h3 className="text-lg font-bold text-foreground mb-3">{concept.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{concept.description}</p>
              </GlassCard>

              <GlassCard>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon-green" />
                  C Engine Source Code
                </h4>
                <pre className="font-mono text-[11px] leading-5 text-neon-green/70 bg-neon-green/5 rounded-lg p-3 overflow-x-auto whitespace-pre">
                  {concept.cCode}
                </pre>
              </GlassCard>

              <GlassCard className="border-neon-cyan/10">
                <p className="text-xs text-muted">
                  <span className="text-neon-cyan font-semibold">💡 Tip:</span> Play the{" "}
                  <a href="/play/solo" className="text-neon-cyan hover:underline">Solo Mode</a> to see these concepts visualized in real-time as you play.
                </p>
              </GlassCard>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
