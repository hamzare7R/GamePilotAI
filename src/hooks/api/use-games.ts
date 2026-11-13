"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { gamesService } from "@/services/games.service";
import type { ListGamesParams } from "@/types/game";

export function useGames(params: ListGamesParams = {}) {
  return useQuery({
    queryKey: queryKeys.games.list(params),
    queryFn: () => gamesService.list(params),
  });
}
