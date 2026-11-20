"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Clock,
  Flame,
  Gamepad2,
  Info,
  LogIn,
  RefreshCw,
  Rocket,
  Sparkles,
  TrendingUp,
  X,
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
import { Button } from "@/components/ui/button";
import { useLibraryMembership, useAddToLibrary, useRemoveFromLibrary } from "@/hooks/api/use-library";
import { ApiError } from "@/lib/api/client";
import { hasActiveFilters } from "@/lib/catalog";
import {
  allowsMockLibraryEntries,
  describeMembershipFailure,
  libraryMembershipKey,
  resolveLibraryGameSource,
} from "@/lib/library";
import type { AuthState } from "@/types/auth";
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
  authState: AuthState;
};

export function GamesDiscovery({ sections, authState }: GamesDiscoveryProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<CatalogFilters>(emptyCatalogFilters);
  const [browseAll, setBrowseAll] = useState(false);
  const [activeGame, setActiveGame] = useState<GameCatalogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState<string | null>(null);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const explorerRef = useRef<HTMLDivElement>(null);

  const membershipQuery = useLibraryMembership(authState === "authenticated");
  const addToLibrary = useAddToLibrary();
  const removeFromLibrary = useRemoveFromLibrary();

  const membershipMap = membershipQuery.data;
  const membershipPending = authState === "authenticated" && membershipQuery.isPending;
  const membershipFailure =
    authState === "authenticated" ? describeMembershipFailure(membershipQuery.error) : null;
  const libraryUnavailable = authState === "unavailable" || membershipFailure !== null;

  const isInLibrary = (game: GameCatalogEntry) =>
    membershipMap?.has(libraryMembershipKey(resolveLibraryGameSource(game), game.id)) ?? false;

  const showLibraryError = (error: unknown) => {
    setLibraryNotice(
      error instanceof ApiError ? error.message : "The library action could not be completed.",
    );
  };

  const toggleLibrary = (game: GameCatalogEntry) => {
    setLibraryNotice(null);

    if (authState === "unauthenticated") {
      router.push("/login?next=/games");
      return;
    }
    if (libraryUnavailable) {
      setLibraryNotice(
        membershipFailure?.kind === "storage"
          ? "Library storage has not been initialized on this deployment yet, so games cannot be added or removed."
          : "Your library is temporarily unavailable. Adding and removing games is paused.",
      );
      return;
    }
    if (membershipPending) {
      setLibraryNotice("Library status is still loading. Try again in a moment.");
      return;
    }
    const source = resolveLibraryGameSource(game);
    if (source === "mock" && !allowsMockLibraryEntries()) {
      setLibraryNotice("Demo catalog games cannot be saved to a library in production.");
      return;
    }
    if (pendingGameId) return;

    const membership = membershipMap?.get(libraryMembershipKey(source, game.id));
    setPendingGameId(game.id);

    if (membership) {
      removeFromLibrary.mutate(membership.entryId, {
        onError: showLibraryError,
        onSettled: () => setPendingGameId(null),
      });
      return;
    }

    addToLibrary.mutate(
      { gameId: game.id },
      {
        onError: showLibraryError,
        onSettled: () => setPendingGameId(null),
      },
    );
  };

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

  const trending = sections.trending;
  const isLive = sections.availability === "live";

  return (
    <div className="space-y-10">
      {authState === "unavailable" ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Your library is temporarily unavailable. Browsing the catalog and game details still
              work; adding or removing games will resume when the library database is reachable.
            </span>
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.refresh()}
            className="w-fit shrink-0"
          >
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : null}

      {membershipFailure ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            {membershipFailure.kind === "session"
              ? "Your session has expired, so your library status cannot be shown."
              : membershipFailure.kind === "storage"
                ? "Library storage has not been initialized on this deployment yet, so adding and removing games is unavailable."
                : membershipFailure.kind === "temporary"
                  ? "Your library status could not be loaded because the library database is temporarily unavailable. Adding and removing games is paused."
                  : "Your library status could not be loaded, so adding and removing games is paused."}
          </span>
          {membershipFailure.kind === "session" ? (
            <Button size="sm" variant="secondary" asChild className="w-fit shrink-0">
              <Link href="/login?next=/games">
                <LogIn aria-hidden="true" />
                Sign in again
              </Link>
            </Button>
          ) : membershipFailure.kind === "storage" ? null : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void membershipQuery.refetch()}
              disabled={membershipQuery.isFetching}
              className="w-fit shrink-0"
            >
              <RefreshCw
                className={membershipQuery.isFetching ? "animate-spin" : undefined}
                aria-hidden="true"
              />
              {membershipQuery.isFetching ? "Retrying…" : "Retry"}
            </Button>
          )}
        </div>
      ) : null}

      {sections.availability !== "live" ? (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-100/90 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {sections.availability === "fallback"
                ? "Live game data is temporarily unavailable. Showing the demo catalog."
                : "Live game data is not available in this environment. Showing the demo catalog."}
            </span>
          </span>
          {sections.availability === "fallback" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.refresh()}
              className="w-fit shrink-0"
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {libraryNotice ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive"
        >
          <span>{libraryNotice}</span>
          <button
            type="button"
            onClick={() => setLibraryNotice(null)}
            aria-label="Dismiss library message"
            className="rounded-md p-1 transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {sections.featured ? (
        <FeaturedGameHero
          game={sections.featured}
          inLibrary={isInLibrary(sections.featured)}
          onToggleLibrary={toggleLibrary}
          libraryAvailable={authState !== "unavailable"}
          libraryUnavailable={libraryUnavailable}
          libraryStatusPending={membershipPending}
          libraryBusy={pendingGameId === sections.featured.id}
          onOpen={handleOpen}
        />
      ) : (
        <EmptyState
          icon={Gamepad2}
          title="No featured game yet"
          description="No featured game is available right now. Search the catalog below or try again in a moment."
          action={
            <Badge variant="outline" className="mt-1">
              {sections.availability === "live" ? "Live RAWG catalog" : "Demo catalog"}
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
              Seven ecosystems, one catalog. Pick a platform to search matching games.
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
                title="Most added games"
                description={
                  isLive
                    ? "Titles players are adding to their collections most on RAWG"
                    : "Sample catalog titles ordered by their demo popularity rank"
                }
                games={trending}
                onOpen={handleOpen}
              />
            ) : null}

            {sections.popular.length > 0 ? (
              <GameGrid
                id="popular"
                icon={TrendingUp}
                title="Popular games"
                description={
                  isLive
                    ? "The highest-rated titles in the RAWG catalog"
                    : "Sample catalog titles ordered by their demo audience size"
                }
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
                {sections.availability === "live"
                  ? "Sections are pulled live from RAWG and cached for an hour."
                  : sections.availability === "fallback"
                    ? "Demo catalog data is shown while live game data recovers."
                    : "Demo catalog data is shown because live game data is not available."}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                {sections.availability === "live" ? "Updated hourly" : "Demo data"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <GameDetailDialog
        game={activeGame}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        inLibrary={activeGame ? isInLibrary(activeGame) : false}
        onToggleLibrary={toggleLibrary}
        libraryAvailable
        libraryUnavailable={libraryUnavailable}
        libraryStatusPending={membershipPending}
        libraryBusy={pendingGameId !== null}
        onSelectGame={handleOpen}
      />
    </div>
  );
}
