"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { catalogQueryService } from "@/services/catalog-query.service";

export function useSimilarGames(gameId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.catalog.similar(gameId ?? "none"),
    queryFn: ({ signal }) => catalogQueryService.similar(gameId as string, signal),
    enabled: enabled && Boolean(gameId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
