"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { catalogQueryService } from "@/services/catalog-query.service";

export function useGameDetail(gameId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.catalog.detail(gameId ?? "none"),
    queryFn: ({ signal }) => catalogQueryService.detail(gameId as string, signal),
    enabled: enabled && Boolean(gameId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
