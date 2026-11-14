import { Check, ChevronRight } from "lucide-react";

import { platformList } from "@/config/catalog";
import { cn } from "@/lib/utils";
import type { PlatformFilter } from "@/types/catalog";

type PlatformBrowserProps = {
  active: PlatformFilter;
  onSelect: (platform: PlatformFilter) => void;
};

export function PlatformBrowser({ active, onSelect }: PlatformBrowserProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {platformList.map((platform) => {
        const Icon = platform.icon;
        const isActive = active === platform.id;

        return (
          <button
            key={platform.id}
            type="button"
            aria-pressed={isActive}
            title={`${platform.label} · ${platform.coverage}`}
            onClick={() => onSelect(isActive ? "all" : platform.id)}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5",
              "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              isActive
                ? "border-primary/60 bg-primary/10 shadow-glow-purple"
                : "border-border/70 bg-card/40 backdrop-blur-md hover:border-primary/35 hover:bg-card/70",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10",
                platform.surface,
              )}
            >
              <Icon className={cn("size-4", platform.accent)} aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-sm font-medium">{platform.shortLabel}</span>
                {isActive ? (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <ChevronRight
                    className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {platform.shortCoverage}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
