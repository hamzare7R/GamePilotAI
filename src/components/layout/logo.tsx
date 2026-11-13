import Link from "next/link";
import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  showText?: boolean;
  className?: string;
};

export function Logo({ href = "/", showText = true, className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="GamePilot AI home"
    >
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow-purple transition-transform duration-300 group-hover:scale-105">
        <Zap className="size-4.5 fill-white text-white" strokeWidth={2.5} />
      </span>
      {showText ? (
        <span className="font-display text-lg font-semibold tracking-tight">
          GamePilot
          <span className="ml-1 text-gradient">AI</span>
        </span>
      ) : null}
    </Link>
  );
}
