import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/80 bg-card/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-gradient-brand opacity-30 blur-xl" />
        <div className="relative flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-card text-primary">
          <Icon className="size-5" />
        </div>
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
