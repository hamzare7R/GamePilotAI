import { Check, ChevronRight } from "lucide-react";

import { gameCategories } from "@/config/catalog";
import { cn } from "@/lib/utils";
import type { GenreFilter } from "@/types/catalog";

type CategoryBrowserProps = {
  active: GenreFilter;
  onSelect: (genre: GenreFilter) => void;
};

export function CategoryBrowser({ active, onSelect }: CategoryBrowserProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {gameCategories.map((category) => {
        const Icon = category.icon;
        const isActive = active === category.id;

        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? "all" : category.id)}
            className={cn(
              "group relative flex items-center gap-2.5 overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5",
              "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              isActive
                ? "border-primary/60 bg-primary/10 shadow-glow-purple"
                : "border-border/70 bg-card/40 backdrop-blur-md hover:border-primary/35 hover:bg-card/70",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-background/50",
                category.accent,
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-sm font-medium">{category.label}</span>
                {isActive ? (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <ChevronRight
                    className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {category.blurb}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
