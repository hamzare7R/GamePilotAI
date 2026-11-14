"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

import { GameGrid } from "@/components/games/game-grid";
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
