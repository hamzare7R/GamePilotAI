import { Info, Sparkles, Star } from "lucide-react";

import { LibraryActionButton } from "@/components/games/library-action-button";
import { PlatformStack } from "@/components/games/platform-stack";
import { GameImage } from "@/components/media/game-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatReleaseDate } from "@/lib/catalog";
import { CUSTOM_PLACEHOLDER_HERO } from "@/lib/custom-game";
import type { GameCatalogEntry } from "@/types/catalog";

type FeaturedGameHeroProps = {
  game: GameCatalogEntry;
  inLibrary: boolean;
  onToggleLibrary?: (game: GameCatalogEntry) => void;
  libraryAvailable?: boolean;
  libraryUnavailable?: boolean;
  libraryStatusPending?: boolean;
  libraryBusy?: boolean;
  onOpen: (game: GameCatalogEntry) => void;
};

export function FeaturedGameHero({
  game,
  inLibrary,
  onToggleLibrary,
  libraryAvailable = false,
  libraryUnavailable = false,
  libraryStatusPending = false,
  libraryBusy = false,
  onOpen,
}: FeaturedGameHeroProps) {
  const hasDetails = Boolean(game.developer || game.publisher || game.platforms.length > 0);

  return (
    <section
      aria-labelledby="featured-game-title"
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[0_0_90px_-45px_rgb(168_85_247/0.75)]"
    >
      <GameImage
        src={game.heroUrl ?? game.coverUrl}
        alt={`${game.title} key art`}
        fallbackSrc={CUSTOM_PLACEHOLDER_HERO}
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
          <PlatformStack platforms={game.platforms} size="md" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <LibraryActionButton
            size="lg"
            inLibrary={inLibrary}
            available={libraryAvailable}
            unavailable={libraryUnavailable}
            statusPending={libraryStatusPending}
            busy={libraryBusy}
            className="border-white/15 bg-white/5 backdrop-blur-md"
            inLibraryClassName="border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/15"
            onToggle={() => onToggleLibrary?.(game)}
          />
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

        {hasDetails ? (
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
            {game.platforms.length > 0 ? (
              <div>
                <dt className="text-muted-foreground/70">Platforms</dt>
                <dd className="mt-0.5 font-medium text-foreground/90">
                  {game.platforms.length} supported
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
