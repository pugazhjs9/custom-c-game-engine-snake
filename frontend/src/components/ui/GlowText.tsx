"use client";
import { cn } from "@/lib/utils";

interface GlowTextProps {
  children: React.ReactNode;
  color?: "cyan" | "purple" | "green" | "pink";
  as?: "h1" | "h2" | "h3" | "span" | "p";
  className?: string;
}

const glowClasses = {
  cyan: "text-neon-cyan text-glow-cyan",
  purple: "text-neon-purple text-glow-purple",
  green: "text-neon-green text-glow-green",
  pink: "text-neon-pink text-glow-pink",
};

export default function GlowText({
  children,
  color = "cyan",
  as: Tag = "span",
  className,
}: GlowTextProps) {
  return (
    <Tag className={cn(glowClasses[color], className)}>
      {children}
    </Tag>
  );
}
