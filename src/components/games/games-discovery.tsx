"use client";

import { useRef, useState } from "react";
import {
  CalendarClock,
  Clock,
  Flame,
  Gamepad2,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { CatalogExplorer } from "@/components/games/catalog-explorer";
import { CategoryBrowser } from "@/components/games/category-browser";
import { CustomGamesRail } from "@/components/games/custom-games-rail";
import { FeaturedGameHero } from "@/components/games/featured-game-hero";
import { GameDetailDialog } from "@/components/games/game-detail-dialog";
import { GameGrid } from "@/components/games/game-grid";
import { PlatformBrowser } from "@/components/games/platform-browser";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { hasActiveFilters } from "@/lib/catalog";
import {
  emptyCatalogFilters,
  type CatalogFilters,
  type CatalogSections,
  type GameCatalogEntry,
  type GenreFilter,
  type PlatformFilter,
} from "@/types/catalog";

type GamesDiscoveryProps = {
  sections: CatalogSections;
};

export function GamesDiscovery({ sections }: GamesDiscoveryProps) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyCatalogFilters);
  const [browseAll, setBrowseAll] = useState(false);
  const [libraryIds, setLibraryIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [activeGame, setActiveGame] = useState<GameCatalogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const explorerRef = useRef<HTMLDivElement>(null);

  const searchMode = browseAll || hasActiveFilters(filters);

  const scrollToExplorer = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    explorerRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const updateFilters = (patch: Partial<CatalogFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  };

  const handlePlatformSelect = (platform: PlatformFilter) => {
    updateFilters({ platform });
    scrollToExplorer();
  };

  const handleGenreSelect = (genre: GenreFilter) => {
    updateFilters({ genre });
    scrollToExplorer();
  };

  const handleReset = () => {
    setFilters(emptyCatalogFilters);
    setBrowseAll(false);
  };

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

  const trending = sections.trending;

  return (
    <div className="space-y-10">
      {sections.featured ? (
        <FeaturedGameHero
          game={sections.featured}
          inLibrary={libraryIds.has(sections.featured.id)}
          onToggleLibrary={handleToggleLibrary}
          onOpen={handleOpen}
        />
      ) : (
        <EmptyState
          icon={Gamepad2}
          title="No featured game yet"
          description="The catalog responded without a highlight. Search below or retry in a moment."
          action={
            <Badge variant="outline" className="mt-1">
              {sections.source === "rawg" ? "Live RAWG catalog" : "Demo catalog"}
            </Badge>
          }
        />
      )}

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
              Seven ecosystems, one catalog. Pick a platform to filter every section below.
            </p>
          </div>
          {filters.platform !== "all" ? (
            <button
              type="button"
              onClick={() => updateFilters({ platform: "all" })}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
            >
              Clear platform
            </button>
          ) : null}
        </div>

        <PlatformBrowser active={filters.platform} onSelect={handlePlatformSelect} />
      </section>

      <section
        id="categories"
        aria-labelledby="categories-title"
        className="scroll-mt-24 space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="categories-title"
              className="font-display text-xl font-semibold tracking-tight sm:text-2xl"
            >
              Game categories
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Twelve ways in. Pick a category to jump straight to matching games.
            </p>
          </div>
          {filters.genre !== "all" ? (
            <button
              type="button"
              onClick={() => updateFilters({ genre: "all" })}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
            >
              Clear category
            </button>
          ) : null}
        </div>

        <CategoryBrowser active={filters.genre} onSelect={handleGenreSelect} />
      </section>

      <div ref={explorerRef} id="explore" className="scroll-mt-20 space-y-8">
        <CatalogExplorer
          filters={filters}
          searchMode={searchMode}
          browseAll={browseAll}
          onChange={updateFilters}
          onReset={handleReset}
          onBrowseAll={() => setBrowseAll(true)}
          onOpenGame={handleOpen}
        />

        {!searchMode ? (
          <div className="space-y-8">
            <CustomGamesRail onOpen={handleOpen} />

            {trending.length > 0 ? (
              <GameGrid
                id="trending"
                icon={Flame}
                title="Trending games"
                description="What players are launching right now"
                games={trending}
                onOpen={handleOpen}
              />
            ) : null}

            {sections.popular.length > 0 ? (
              <GameGrid
                id="popular"
                icon={TrendingUp}
                title="Popular games"
                description="The highest-rated titles players keep coming back to"
                games={sections.popular}
                onOpen={handleOpen}
              />
            ) : null}

            {sections.upcoming.length > 0 ? (
              <GameGrid
                id="upcoming"
                icon={Rocket}
                title="Upcoming games"
                description="Confirmed releases on the horizon"
                games={sections.upcoming}
                onOpen={handleOpen}
                showReleaseDate
              />
            ) : null}

            {sections.recentlyReleased.length > 0 ? (
              <GameGrid
                id="new-releases"
                icon={Clock}
                title="Recently released"
                description="Fresh out of the gate in the last 90 days"
                games={sections.recentlyReleased}
                onOpen={handleOpen}
                showReleaseDate
              />
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/30 px-4 py-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                {sections.source === "rawg"
                  ? "Sections are pulled live from RAWG and cached for an hour."
                  : "Running on the bundled demo catalog. Add RAWG_API_KEY for live data."}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                Updated hourly
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <GameDetailDialog
        game={activeGame}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        inLibrary={activeGame ? libraryIds.has(activeGame.id) : false}
        onToggleLibrary={handleToggleLibrary}
        onSelectGame={handleOpen}
      />
    </div>
  );
}
