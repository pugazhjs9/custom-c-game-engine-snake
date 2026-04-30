"use client";
import { cn } from "@/lib/utils";

export default function MeteorEffect({ count = 15 }: { count?: number }) {
  const meteors = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map((i) => (
        <span
          key={i}
          className={cn(
            "absolute h-0.5 w-0.5 rounded-full bg-neon-cyan rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-1/2",
            "before:w-[50px] before:h-[1px]",
            "before:bg-gradient-to-r before:from-neon-cyan before:to-transparent",
            "animate-meteor"
          )}
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 3 + 3}s`,
          }}
        />
      ))}
    </div>
  );
}
