import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: "purple" | "blue";
};

export function StatCard({ label, value, hint, icon: Icon, accent = "purple" }: StatCardProps) {
  return (
    <Card className="gap-0 py-5 transition-colors hover:border-primary/30">
      <CardContent className="flex items-start justify-between gap-4 px-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-display text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
            accent === "blue"
              ? "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan"
              : "border-primary/25 bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
