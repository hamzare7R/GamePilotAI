"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusCircle, RefreshCw } from "lucide-react";

import { GameGrid } from "@/components/games/game-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import type { GameCatalogEntry } from "@/types/catalog";

/**
 * Owner-authored entries are served from a dedicated endpoint so the static
 * /games page stays cacheable while new games still show up immediately.
 */
export function CustomGamesRail({ onOpen }: { onOpen: (game: GameCatalogEntry) => void }) {
  const query = useQuery({
    queryKey: ["custom-games", "rail"],
    queryFn: ({ signal }) =>
      apiClient.get<GameCatalogEntry[]>("/custom-games", {
        query: { limit: 8 },
        signal,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  const games = query.data ?? [];

  if (query.isPending) {
    return (
      <section aria-label="Added by GamePilot" aria-busy="true" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <PlusCircle className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Added by GamePilot
              </h2>
              <p className="text-xs text-muted-foreground">
                Titles published directly to the catalog by the site owner
              </p>
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-3/4 w-full rounded-xl" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (query.isError && games.length === 0) {
    return (
      <section aria-label="Added by GamePilot" className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <PlusCircle className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Added by GamePilot
            </h2>
            <p className="text-xs text-muted-foreground">
              Titles published directly to the catalog by the site owner
            </p>
          </div>
        </div>
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Owner-published games are temporarily unavailable.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={query.isFetching ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (games.length === 0) return null;

  return (
    <GameGrid
      id="custom"
      icon={PlusCircle}
      title="Added by GamePilot"
      description="Titles published directly to the catalog by the site owner"
      games={games}
      onOpen={onOpen}
    />
  );
}
