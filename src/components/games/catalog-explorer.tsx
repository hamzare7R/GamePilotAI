"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Compass,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";

import { GameCard } from "@/components/games/game-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { genreLabels, platformList } from "@/config/catalog";
import { useCatalogSearch } from "@/hooks/api/use-catalog-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { CatalogFilters, GameCatalogEntry, PlatformFilter } from "@/types/catalog";

type CatalogExplorerProps = {
  filters: CatalogFilters;
  searchMode: boolean;
  browseAll: boolean;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onReset: () => void;
  onBrowseAll: () => void;
  onOpenGame: (game: GameCatalogEntry) => void;
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

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="aspect-3/4 w-full rounded-xl" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function CatalogExplorer({
  filters,
  searchMode,
  browseAll,
  onChange,
  onReset,
  onBrowseAll,
  onOpenGame,
}: CatalogExplorerProps) {
  const debouncedQuery = useDebouncedValue(filters.query, 300);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const params = useMemo(
    () => ({
      search: debouncedQuery.trim() || undefined,
      platform: filters.platform === "all" ? undefined : filters.platform,
      genre: filters.genre === "all" ? undefined : filters.genre,
      pageSize: 8,
    }),
    [debouncedQuery, filters.platform, filters.genre],
  );

  const query = useCatalogSearch(params, searchMode);
  const { data, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  const games = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? 0;
  const isSettling = filters.query !== debouncedQuery;
  const isBusy = isSettling || (query.isFetching && !isFetchingNextPage);

  useEffect(() => {
    if (!searchMode) return;
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "480px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [searchMode, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const clearQuery = () => onChange({ query: "" });

  const summary = searchMode
    ? isBusy
      ? "Updating results…"
      : total > 0
        ? `${total.toLocaleString("en-US")} games match your filters`
        : "Searching the live catalog"
    : "Search titles, studios and genres across the whole catalog";

  const hasActiveFilters =
    filters.query.trim().length > 0 || filters.platform !== "all" || filters.genre !== "all";

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4 backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-gradient-brand-soft text-primary">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Explore the catalog</h2>
              <p className="text-xs text-muted-foreground">{summary}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:max-w-xl lg:flex-1 lg:justify-end">
            <form
              role="search"
              onSubmit={(event) => event.preventDefault()}
              className="relative w-full lg:max-w-sm"
            >
              <label htmlFor="game-search" className="sr-only">
                Search games
              </label>
              <Search
                className={cn(
                  "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground",
                  isBusy && "animate-pulse text-primary",
                )}
                aria-hidden="true"
              />
              <Input
                id="game-search"
                type="search"
                value={filters.query}
                autoComplete="off"
                placeholder="Search any game by name…"
                onChange={(event) => onChange({ query: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Escape") clearQuery();
                }}
                className="h-10 bg-background/60 pr-9 pl-9"
              />
              {filters.query ? (
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </form>

            {!searchMode ? (
              <Button variant="secondary" onClick={onBrowseAll} className="shrink-0">
                <Layers aria-hidden="true" />
                Browse all
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
              Platform
            </span>
            <FilterChip
              active={filters.platform === "all"}
              onClick={() => onChange({ platform: "all" })}
            >
              All platforms
            </FilterChip>
            {platformList.map((platform) => (
              <FilterChip
                key={platform.id}
                active={filters.platform === platform.id}
                icon={platform.icon}
                onClick={() =>
                  onChange({ platform: platform.id as PlatformFilter })
                }
              >
                {platform.shortLabel}
              </FilterChip>
            ))}
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
              Active
            </span>
            {filters.query.trim() ? (
              <Badge variant="default" className="gap-1.5">
                “{filters.query.trim()}”
                <button
                  type="button"
                  onClick={clearQuery}
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
                  onClick={() => onChange({ platform: "all" })}
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
                  onClick={() => onChange({ genre: "all" })}
                  aria-label="Remove genre filter"
                  className="transition-opacity hover:opacity-70"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </Badge>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto">
              Reset all
            </Button>
          </div>
        ) : null}
      </div>

      {searchMode ? (
        <div id="catalog-results" className="scroll-mt-24 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Compass className="size-4" aria-hidden="true" />
                )}
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {filters.query.trim()
                    ? `Results for “${filters.query.trim()}”`
                    : browseAll
                      ? "Every game in the catalog"
                      : "Filtered catalog"}
                </h2>
                <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                  {query.isPending
                    ? "Loading games…"
                    : `${games.length} of ${total.toLocaleString("en-US")} titles loaded`}
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {total.toLocaleString("en-US")} {total === 1 ? "title" : "titles"}
            </Badge>
          </div>

          {query.isPending ? (
            <ResultsSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
              <p className="font-display text-base font-semibold">Couldn&apos;t reach the catalog</p>
              <p className="max-w-md text-sm text-muted-foreground">
                The games service did not respond. Check your connection and try again.
              </p>
              <Button variant="secondary" onClick={() => void refetch()}>
                <RefreshCw aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : games.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No games match that search"
              description="Try a different title, or clear the platform and category filters."
              action={
                <Button variant="secondary" onClick={onReset}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} onOpen={onOpenGame} />
                ))}
              </div>

              <div ref={sentinelRef} className="flex flex-col items-center gap-2 pt-1">
                {hasNextPage ? (
                  <Button
                    variant="secondary"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : null}
                    {isFetchingNextPage ? "Loading more…" : "Load more games"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    End of results · {total.toLocaleString("en-US")} titles
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
