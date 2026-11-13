import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-left",
        className,
      )}
    >
      {eyebrow ? (
        <span className="text-xs font-semibold tracking-[0.2em] text-brand-cyan uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}
