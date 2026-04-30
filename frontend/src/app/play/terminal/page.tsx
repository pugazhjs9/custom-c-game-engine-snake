"use client";
import { useEffect, useRef, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import GlowText from "@/components/ui/GlowText";
import { Terminal } from "lucide-react";

const C_SOURCE = `/* main.c — Game Loop (simplified) */
while (1) {
    /* Drain ALL pending keys */
    while (keyPressed()) {
        char key = readKey();
        if (key == 'q') { should_quit = 1; break; }
        game_handle_input(&game, key);
    }
    if (should_quit) break;

    /* Update game state */
    if (game.state == STATE_PLAYING)
        game_update(&game);

    /* Render current frame */
    game_render(&game);

    /* Delay — vertical gets 2x compensation */
    if (game.dir == DIR_UP || game.dir == DIR_DOWN)
        current_delay = math_mul(game.tick_ms, 2);
    else
        current_delay = game.tick_ms;

    elapsed = 0;
    while (elapsed < current_delay) {
        usleep(sleep_chunk);
        elapsed += 10;
        if (keyPressed()) break;
    }
}`;

export default function TerminalPage() {
  const termRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // Simulate terminal output
    const bootSequence = [
      "$ gcc -Wall -Wextra -pedantic -std=c99 -I include -o snake src/*.c",
      "$ ./snake",
      "",
      "╔══════════════════════════════════════╗",
      "║            S N A K E                 ║",
      "║                                     ║",
      "║          ▶═══                        ║",
      "║                        ●             ║",
      "║                                     ║",
      "║                                     ║",
      "╚══════════════════════════════════════╝",
      "SCORE: 0    HI: 0    SPEED: 1",
      "WASD/Arrows:Move  Q:Quit  R:Restart",
      "",
      "[mem_init] Pool initialized: 65536 bytes",
      "[mem_alloc] 4 × Segment = 96 bytes allocated",
      "[kb_init] Terminal set to raw mode (TCSAFLUSH)",
      "[screen_init] Alternate buffer activated, cursor hidden",
      "[game_init] Snake spawned at center, length=4",
      "[game_spawn_food] Food placed at random free cell",
      "",
      "Game is running... (this is a simulated view)",
      "For the real terminal experience, run: make clean && make && ./snake",
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < bootSequence.length) {
        setLines((prev) => [...prev, bootSequence[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 top-16 overflow-hidden flex flex-col bg-slate-950/20">
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col min-h-0">
        <div className="flex items-center gap-3 mb-5">
          <Terminal className="w-5 h-5 text-neon-green" />
          <h1 className="text-xl font-bold">Terminal <GlowText color="green">Mode</GlowText></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Terminal */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted font-mono ml-2">snake — zsh — 80×24</span>
            </div>
            <div ref={termRef} className="p-5 font-mono text-[14px] leading-6 flex-1 overflow-y-auto bg-[#0c0c14] custom-scrollbar">
              {lines.map((line, i) => (
                <div key={i} className={`${line.startsWith("$") ? "text-neon-green" : line.startsWith("[") ? "text-neon-cyan" : "text-foreground/80"}`}>
                  {line || "\u00A0"}
                </div>
              ))}
              <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse" />
            </div>
          </div>

          {/* C Source Code */}
          <div className="space-y-4 h-[calc(100vh-140px)] overflow-y-auto pr-1 custom-scrollbar">
            <GlassCard>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-orange" />
                C Source: Game Loop
              </h3>
              <pre className="font-mono text-[13px] leading-6 text-foreground/70 overflow-x-auto whitespace-pre custom-scrollbar pb-2">
                {C_SOURCE}
              </pre>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-foreground mb-3">OS Concepts in Terminal Mode</h3>
              <div className="space-y-2 text-xs text-muted">
                <div className="flex gap-2">
                  <span className="text-neon-cyan font-semibold shrink-0">termios:</span>
                  <span>Raw mode via tcsetattr() — disables canonical mode and echo</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-neon-green font-semibold shrink-0">fcntl:</span>
                  <span>O_NONBLOCK flag for non-blocking keyboard reads</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-neon-purple font-semibold shrink-0">ANSI:</span>
                  <span>Escape codes for cursor movement and color (CSI sequences)</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-neon-orange font-semibold shrink-0">setvbuf:</span>
                  <span>64KB stdout buffer for atomic frame rendering</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-neon-pink font-semibold shrink-0">SIGWINCH:</span>
                  <span>Signal handler for terminal resize events</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-semibold text-foreground mb-2">Run Natively</h3>
              <code className="text-xs font-mono text-neon-green bg-neon-green/5 px-3 py-2 rounded-lg block">
                cd custom-c-game-engine-snake && make clean && make && ./snake
              </code>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
