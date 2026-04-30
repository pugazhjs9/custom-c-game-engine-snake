"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "purple" | "green" | "pink" | "none";
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className,
  hover = true,
  glow = "none",
  onClick,
}: GlassCardProps) {
  const glowMap = {
    cyan: "hover:shadow-[0_0_30px_rgba(0,240,255,0.15)]",
    purple: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
    green: "hover:shadow-[0_0_30px_rgba(34,255,136,0.15)]",
    pink: "hover:shadow-[0_0_30px_rgba(255,34,136,0.15)]",
    none: "",
  };

  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={cn(
        "glass rounded-2xl p-6 transition-shadow duration-300",
        glowMap[glow],
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
