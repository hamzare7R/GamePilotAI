import Image from "next/image";
import { Check, Info, Plus, Sparkles, Star, Users } from "lucide-react";

import { PlatformStack } from "@/components/games/platform-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPlayers, formatReleaseDate } from "@/lib/catalog";
import type { GameCatalogEntry } from "@/types/catalog";

type FeaturedGameHeroProps = {
  game: GameCatalogEntry;
  inLibrary: boolean;
  onToggleLibrary: (game: GameCatalogEntry) => void;
  onOpen: (game: GameCatalogEntry) => void;
};

export function FeaturedGameHero({
  game,
  inLibrary,
  onToggleLibrary,
  onOpen,
}: FeaturedGameHeroProps) {
  const players = formatPlayers(game.playersOnline);

  return (
    <section
      aria-labelledby="featured-game-title"
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[0_0_90px_-45px_rgb(168_85_247/0.75)]"
    >
      <Image
        src={game.heroUrl ?? game.coverUrl}
        alt={`${game.title} key art`}
        fill
        priority
        sizes="(min-width: 1280px) 1216px, 100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-linear-to-r from-background via-background/85 to-background/15" />
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 size-64 rounded-full bg-brand-cyan/15 blur-3xl" />

      <div className="relative flex min-h-[500px] flex-col justify-end gap-5 p-5 sm:min-h-[480px] sm:justify-center sm:p-8 lg:min-h-[520px] lg:p-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-primary uppercase backdrop-blur-md">
            <Sparkles className="size-3" aria-hidden="true" />
            Featured
          </span>
          {game.trendingRank ? (
            <Badge variant="blue" className="border-brand-cyan/30 bg-black/40 backdrop-blur-md">
              #{game.trendingRank} trending
            </Badge>
          ) : null}
          <Badge variant="outline" className="border-white/15 bg-black/40 text-foreground/80 backdrop-blur-md">
            {formatReleaseDate(game.releaseDate)}
          </Badge>
        </div>

        <div className="max-w-xl space-y-3">
          <h2
            id="featured-game-title"
            className="font-display text-4xl leading-[1.02] font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {game.title}
          </h2>
          <div className="h-1 w-16 rounded-full bg-gradient-brand" />
          <p className="text-sm leading-relaxed text-foreground/80 sm:text-base">{game.tagline}</p>
          {game.description ? (
            <p className="hidden max-w-lg text-sm leading-relaxed text-muted-foreground sm:block">
              {game.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {game.rating ? (
            <span className="inline-flex items-center gap-1.5 text-amber-200">
              <Star className="size-4 fill-amber-300 text-amber-300" aria-hidden="true" />
              <span className="font-semibold text-amber-100">{game.rating.toFixed(1)}</span>
              <span className="text-amber-200/60">/ 10</span>
            </span>
          ) : null}
          {players ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {players} playing now
            </span>
          ) : null}
          <PlatformStack platforms={game.platforms} size="md" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="lg"
            variant={inLibrary ? "secondary" : "default"}
            aria-pressed={inLibrary}
            onClick={() => onToggleLibrary(game)}
            className={inLibrary ? "border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/15" : undefined}
          >
            {inLibrary ? (
              <>
                <Check aria-hidden="true" />
                In your library
              </>
            ) : (
              <>
                <Plus aria-hidden="true" />
                Add to library
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => onOpen(game)}
            className="border-white/15 bg-white/5 backdrop-blur-md hover:bg-white/10"
          >
            <Info aria-hidden="true" />
            View details
          </Button>
        </div>

        <dl className="hidden flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-4 text-xs sm:flex">
          {game.developer ? (
            <div>
              <dt className="text-muted-foreground/70">Developer</dt>
              <dd className="mt-0.5 font-medium text-foreground/90">{game.developer}</dd>
            </div>
          ) : null}
          {game.publisher ? (
            <div>
              <dt className="text-muted-foreground/70">Publisher</dt>
              <dd className="mt-0.5 font-medium text-foreground/90">{game.publisher}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground/70">Platforms</dt>
            <dd className="mt-0.5 font-medium text-foreground/90">
              {game.platforms.length} supported
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
