import { platformMeta } from "@/config/catalog";
import { cn } from "@/lib/utils";
import type { GamePlatform } from "@/types/game";

type PlatformStackProps = {
  platforms: readonly GamePlatform[];
  limit?: number;
  size?: "sm" | "md";
  className?: string;
};

export function PlatformStack({ platforms, limit, size = "sm", className }: PlatformStackProps) {
  const visible = limit ? platforms.slice(0, limit) : platforms;
  const hiddenCount = platforms.length - visible.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {visible.map((platform) => {
        const meta = platformMeta[platform];
        const Icon = meta.icon;

        return (
          <span
            key={platform}
            title={meta.label}
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-white/5 bg-background/60",
              size === "sm" ? "size-6" : "size-7",
            )}
          >
            <Icon
              className={cn(size === "sm" ? "size-3.5" : "size-4", meta.accent)}
              aria-hidden="true"
            />
            <span className="sr-only">{meta.label}</span>
          </span>
        );
      })}
      {hiddenCount > 0 ? (
        <span className="text-[11px] leading-none text-muted-foreground">+{hiddenCount}</span>
      ) : null}
    </div>
  );
}
