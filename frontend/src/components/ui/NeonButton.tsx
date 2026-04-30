"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonButtonProps {
  children: React.ReactNode;
  variant?: "cyan" | "purple" | "green" | "pink" | "gradient";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  href?: string;
  disabled?: boolean;
}

const variantStyles = {
  cyan: "bg-neon-cyan/30 text-neon-cyan border-neon-cyan/60 hover:bg-neon-cyan/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] shadow-[0_0_15px_rgba(0,240,255,0.2)]",
  purple: "bg-neon-purple/30 text-neon-purple border-neon-purple/60 hover:bg-neon-purple/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] shadow-[0_0_15px_rgba(168,85,247,0.2)]",
  green: "bg-neon-green/30 text-neon-green border-neon-green/60 hover:bg-neon-green/40 hover:shadow-[0_0_30px_rgba(34,255,136,0.6)] shadow-[0_0_15px_rgba(34,255,136,0.2)]",
  pink: "bg-neon-pink/30 text-neon-pink border-neon-pink/60 hover:bg-neon-pink/40 hover:shadow-[0_0_30px_rgba(255,34,136,0.6)] shadow-[0_0_15px_rgba(255,34,136,0.2)]",
  gradient: "bg-gradient-to-r from-neon-cyan/40 via-neon-purple/40 to-neon-pink/40 text-white border-white/30 hover:from-neon-cyan/50 hover:via-neon-purple/50 hover:to-neon-pink/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] shadow-[0_0_15px_rgba(168,85,247,0.2)]",
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function NeonButton({
  children,
  variant = "cyan",
  size = "md",
  onClick,
  className,
  disabled,
}: NeonButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border font-semibold transition-all duration-300",
        "backdrop-blur-sm",
        variantStyles[variant],
        sizeStyles[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
