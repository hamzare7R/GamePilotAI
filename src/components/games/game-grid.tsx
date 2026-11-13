import type { LucideIcon } from "lucide-react";

import { GameCard } from "@/components/games/game-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GameCatalogEntry } from "@/types/catalog";

type GameGridProps = {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  games: readonly GameCatalogEntry[];
  onOpen: (game: GameCatalogEntry) => void;
  className?: string;
};

export function GameGrid({ id, title, description, icon: Icon, games, onOpen, className }: GameGridProps) {
  return (
    <section id={id} aria-label={title} className={cn("scroll-mt-24 space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        <Badge variant="outline">
          {games.length} {games.length === 1 ? "title" : "titles"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
