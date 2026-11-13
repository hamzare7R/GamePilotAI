"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarClock,
  Flame,
  Gamepad2,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";

import { FeaturedGameHero } from "@/components/games/featured-game-hero";
import { GameDetailDialog } from "@/components/games/game-detail-dialog";
import { GameGrid } from "@/components/games/game-grid";
import { PlatformBrowser } from "@/components/games/platform-browser";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { genreFilterOptions, genreLabels, platformList } from "@/config/catalog";
import { filterGames, getGameSections, hasActiveFilters } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  emptyCatalogFilters,
  type CatalogFilters,
  type GameCatalogEntry,
  type GenreFilter,
  type PlatformFilter,
} from "@/types/catalog";

type GamesDiscoveryProps = {
  games: readonly GameCatalogEntry[];
  featured: GameCatalogEntry;
};

function FilterChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
        active
          ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_20px_-8px_rgb(168_85_247/0.9)]"
          : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function GamesDiscovery({ games, featured }: GamesDiscoveryProps) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyCatalogFilters);
  const [libraryIds, setLibraryIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [activeGame, setActiveGame] = useState<GameCatalogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const explorerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterGames(games, filters), [games, filters]);
  const sections = useMemo(() => getGameSections(games), [games]);
  const isFiltering = hasActiveFilters(filters);

  const updateFilters = (patch: Partial<CatalogFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const handlePlatformSelect = (platform: PlatformFilter) => {
    updateFilters({ platform });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    explorerRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const handleGenreSelect = (genre: GenreFilter) => updateFilters({ genre });

  const handleOpen = (game: GameCatalogEntry) => {
    setActiveGame(game);
    setDetailOpen(true);
  };

  const handleToggleLibrary = (game: GameCatalogEntry) => {
    setLibraryIds((previous) => {
      const next = new Set(previous);
      if (next.has(game.id)) {
        next.delete(game.id);
      } else {
        next.add(game.id);
      }
      return next;
    });
  };

  const resetFilters = () => setFilters(emptyCatalogFilters);

  const activeFilterCount = [
    filters.query.trim(),
    filters.platform !== "all" ? filters.platform : "",
    filters.genre !== "all" ? filters.genre : "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-10">
      <FeaturedGameHero
        game={featured}
        inLibrary={libraryIds.has(featured.id)}
        onToggleLibrary={handleToggleLibrary}
        onOpen={handleOpen}
      />

      <section id="platforms" aria-labelledby="platforms-title" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="platforms-title"
              className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Browse by platform
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Seven ecosystems, one catalog. Pick a platform to filter everything below.
            </p>
          </div>
          {filters.platform !== "all" ? (
            <Button variant="ghost" size="sm" onClick={() => updateFilters({ platform: "all" })}>
              Clear platform
              <X aria-hidden="true" />
            </Button>
          ) : (
            <Badge variant="outline">{games.length} games</Badge>
          )}
        </div>

        <PlatformBrowser games={games} active={filters.platform} onSelect={handlePlatformSelect} />
      </section>

      <div ref={explorerRef} id="explore" className="scroll-mt-20 space-y-6">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-gradient-brand-soft text-primary">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">Explore the catalog</h2>
                <p className="text-xs text-muted-foreground">
                  {isFiltering
                    ? `${filtered.length} of ${games.length} games match your filters`
                    : `${games.length} games across ${platformList.length} platforms`}
                </p>
              </div>
            </div>

            <form
              role="search"
              onSubmit={(event) => event.preventDefault()}
              className="relative w-full lg:max-w-sm"
            >
              <label htmlFor="game-search" className="sr-only">
                Search games
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="game-search"
                type="search"
                value={filters.query}
                autoComplete="off"
                placeholder="Search titles, studios, genres…"
                onChange={(event) => updateFilters({ query: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Escape") updateFilters({ query: "" });
                }}
                className="h-10 bg-background/60 pr-9 pl-9"
              />
              {filters.query ? (
                <button
                  type="button"
                  onClick={() => updateFilters({ query: "" })}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </form>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                Genre
              </span>
              <FilterChip active={filters.genre === "all"} onClick={() => handleGenreSelect("all")}>
                All
              </FilterChip>
              {genreFilterOptions.map((genre) => (
                <FilterChip
                  key={genre.id}
                  active={filters.genre === genre.id}
                  onClick={() => handleGenreSelect(genre.id)}
                >
                  {genre.label}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                Platform
              </span>
              <FilterChip
                active={filters.platform === "all"}
                onClick={() => updateFilters({ platform: "all" })}
              >
                All platforms
              </FilterChip>
              {platformList.map((platform) => (
                <FilterChip
                  key={platform.id}
                  active={filters.platform === platform.id}
                  icon={platform.icon}
                  onClick={() => updateFilters({ platform: platform.id })}
                >
                  {platform.shortLabel}
                </FilterChip>
              ))}
            </div>
          </div>

          {isFiltering ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                Active
              </span>
              {filters.query.trim() ? (
                <Badge variant="default" className="gap-1.5">
                  “{filters.query.trim()}”
                  <button
                    type="button"
                    onClick={() => updateFilters({ query: "" })}
                    aria-label="Remove search filter"
                    className="transition-opacity hover:opacity-70"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              ) : null}
              {filters.platform !== "all" ? (
                <Badge variant="blue" className="gap-1.5">
                  {platformList.find((platform) => platform.id === filters.platform)?.label}
                  <button
                    type="button"
                    onClick={() => updateFilters({ platform: "all" })}
                    aria-label="Remove platform filter"
                    className="transition-opacity hover:opacity-70"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              ) : null}
              {filters.genre !== "all" ? (
                <Badge variant="secondary" className="gap-1.5">
                  {genreLabels[filters.genre]}
                  <button
                    type="button"
                    onClick={() => updateFilters({ genre: "all" })}
                    aria-label="Remove genre filter"
                    className="transition-opacity hover:opacity-70"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              ) : null}
              <span className="ml-auto text-xs text-muted-foreground">
                {activeFilterCount} active
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset all
              </Button>
            </div>
          ) : null}
        </div>

        {isFiltering ? (
          filtered.length > 0 ? (
            <GameGrid
              id="results"
              icon={Search}
              title="Search results"
              description="Matching every active filter"
              games={filtered}
              onOpen={handleOpen}
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No games match those filters"
              description="Try a different title, or loosen the platform and genre filters."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          )
        ) : (
          <div className="space-y-8">
            <GameGrid
              id="trending"
              icon={Flame}
              title="Trending games"
              description="What pilots are launching right now"
              games={sections.trending}
              onOpen={handleOpen}
            />
            <GameGrid
              id="new-releases"
              icon={CalendarClock}
              title="New releases"
              description="Freshly shipped across every platform"
              games={sections.newReleases}
              onOpen={handleOpen}
            />
            <GameGrid
              id="more-games"
              icon={Gamepad2}
              title="More to discover"
              description="Long-tail favorites and quiet hits"
              games={sections.more}
              onOpen={handleOpen}
            />
          </div>
        )}
      </div>

      <GameDetailDialog
        game={activeGame}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        inLibrary={activeGame ? libraryIds.has(activeGame.id) : false}
        onToggleLibrary={handleToggleLibrary}
      />
    </div>
  );
}
