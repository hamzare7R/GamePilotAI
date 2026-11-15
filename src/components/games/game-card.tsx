import { Play } from "lucide-react";

import { PlatformStack } from "@/components/games/platform-stack";
import { GameImage } from "@/components/media/game-image";
import { RatingBadge } from "@/components/games/rating-badge";
import { Badge } from "@/components/ui/badge";
import { describeGameTags, formatPlayers, formatReleaseDate, isNewRelease } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { GameCatalogEntry } from "@/types/catalog";

type GameCardProps = {
  game: GameCatalogEntry;
  onOpen: (game: GameCatalogEntry) => void;
  showReleaseDate?: boolean;
  className?: string;
};

export function GameCard({ game, onOpen, showReleaseDate, className }: GameCardProps) {
  const dateLabel = showReleaseDate
    ? formatReleaseDate(game.releaseDate)
    : (game.releaseDate?.slice(0, 4) ?? "TBA");

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur-md",
        "transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow-purple",
        "focus-within:border-primary/40 focus-within:shadow-glow-purple",
        className,
      )}
    >
      <div className="relative aspect-3/4 overflow-hidden">
        <GameImage
          src={game.coverUrl}
          alt={`${game.title} cover art`}
          sizes="(min-width: 768px) 24vw, 46vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#07070d] via-[#07070d]/10 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-primary/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <RatingBadge rating={game.rating} />
          {isNewRelease(game) ? (
            <Badge
              variant="blue"
              className="border-brand-cyan/40 bg-black/50 backdrop-blur-md"
            >
              New
            </Badge>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-12 translate-y-2 items-center justify-center rounded-full border border-white/25 bg-white/10 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <Play className="size-5 fill-white text-white" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-semibold">{game.title}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {describeGameTags(game)} · {dateLabel}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <PlatformStack platforms={game.platforms} limit={4} />
          {game.playersOnline ? (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatPlayers(game.playersOnline)} online
            </span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen(game)}
        aria-label={`View ${game.title}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      />
    </article>
  );
}
