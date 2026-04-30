"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import NeonButton from "@/components/ui/NeonButton";
import GlowText from "@/components/ui/GlowText";
import { Gamepad2, Users, Bot, Terminal, Cpu, MemoryStick, Network, Zap } from "lucide-react";

const GAME_MODES = [
  {
    title: "Solo Mode",
    desc: "Classic snake with score tracking, levels, and increasing speed",
    icon: Gamepad2,
    href: "/play/solo",
    color: "cyan" as const,
    gradient: "from-cyan-500/20 to-blue-500/20",
  },
  {
    title: "Multiplayer",
    desc: "Real-time multiplayer via WebSockets — compete with friends",
    icon: Users,
    href: "/play/multiplayer",
    color: "purple" as const,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "AI Mode",
    desc: "Challenge an A* pathfinding AI opponent on the same board",
    icon: Bot,
    href: "/play/ai",
    color: "green" as const,
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Terminal Mode",
    desc: "Experience the original C engine in a terminal emulator",
    icon: Terminal,
    href: "/play/terminal",
    color: "pink" as const,
    gradient: "from-pink-500/20 to-red-500/20",
  },
];

const OS_FEATURES = [
  { title: "Process Management", desc: "Lifecycle, PCB, state transitions", icon: Cpu, color: "#a855f7" },
  { title: "Memory Allocation", desc: "Custom pool allocator, stack/heap", icon: MemoryStick, color: "#22ff88" },
  { title: "CPU Scheduling", desc: "Round Robin, FCFS, priority queues", icon: Zap, color: "#00f0ff" },
  { title: "Networking", desc: "WebSocket packets, TCP handshake", icon: Network, color: "#ff2288" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-xs text-white/90 mb-8 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
            Gaming × Operating Systems — Built from scratch in C
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6"
        >
          <span className="text-foreground">SNAKE</span>
          <GlowText color="cyan" className="ml-2">OS</GlowText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-lg sm:text-xl text-white/90 max-w-2xl mb-10 leading-relaxed text-shadow-sm font-medium"
        >
          Play Snake while visualizing{" "}
          <span className="text-neon-purple font-bold text-shadow-sm">process management</span>,{" "}
          <span className="text-neon-green font-bold text-shadow-sm">memory allocation</span>,{" "}
          <span className="text-neon-cyan font-bold text-shadow-sm">CPU scheduling</span>, and{" "}
          <span className="text-neon-pink font-bold text-shadow-sm">system calls</span> — all in real-time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link href="/play/solo">
            <NeonButton variant="cyan" size="lg">
              <span className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" /> Play Now
              </span>
            </NeonButton>
          </Link>
          <Link href="/os-internals">
            <NeonButton variant="purple" size="lg">
              <span className="flex items-center gap-2">
                <Cpu className="w-5 h-5" /> Explore OS Internals
              </span>
            </NeonButton>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          >
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ GAME MODES ═══ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-24 bg-surface/40 backdrop-blur-xl rounded-[2.5rem] mb-20 border border-white/5 shadow-2xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold mb-3">
            Choose Your <GlowText color="cyan">Mode</GlowText>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted max-w-lg mx-auto">
            Four distinct ways to experience Snake — each with full OS visualization
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {GAME_MODES.map((mode, i) => (
            <motion.div
              key={mode.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 2}
            >
              <Link href={mode.href}>
                <GlassCard hover glow={mode.color} className="h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-4`}>
                    <mode.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{mode.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{mode.desc}</p>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ OS FEATURES ═══ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 py-24 bg-surface/60 backdrop-blur-2xl rounded-[2.5rem] mb-20 border border-white/5 shadow-2xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold mb-3">
            OS Concepts, <GlowText color="purple">Visualized</GlowText>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted max-w-lg mx-auto">
            Watch real Operating System concepts come alive as you play
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {OS_FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 2}
            >
              <GlassCard hover className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${feat.color}15`, border: `1px solid ${feat.color}30` }}
                >
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">{feat.title}</h3>
                  <p className="text-sm text-muted">{feat.desc}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ TECH STACK ═══ */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 py-20 text-center">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={0}
          className="text-2xl font-bold mb-8"
        >
          Built With
        </motion.h2>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={1}
          className="flex flex-wrap justify-center gap-3"
        >
          {["C", "Next.js", "TypeScript", "TailwindCSS", "Framer Motion", "Socket.io", "PostgreSQL", "Node.js"].map((tech) => (
            <span key={tech} className="px-5 py-2.5 rounded-2xl glass-strong text-sm font-semibold text-foreground hover:text-neon-cyan hover:border-neon-cyan/50 transition-all duration-300">
              {tech}
            </span>
          ))}
        </motion.div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center">
        <p className="text-sm text-muted">
          Built from scratch — Custom C game engine × OS visualization platform
        </p>
      </footer>
    </div>
  );
}
