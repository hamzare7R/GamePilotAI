import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { toQuery } from "@/lib/api/query";
import type {
  CatalogPage,
  CatalogQueryParams,
  GameCatalogEntry,
  GameDetailResult,
} from "@/types/catalog";

/**
 * Browser-side catalog client. Always talks to the Next.js API routes so the
 * RAWG key and upstream caching stay on the server.
 */
export const catalogQueryService = {
  search(params: CatalogQueryParams = {}, signal?: AbortSignal) {
    return apiClient.get<CatalogPage>(endpoints.games.list, {
      query: toQuery(params),
      signal,
    });
  },

  detail(gameId: string, signal?: AbortSignal) {
    return apiClient.get<GameDetailResult>(endpoints.games.detail(gameId), { signal });
  },

  similar(gameId: string, signal?: AbortSignal) {
    return apiClient.get<GameCatalogEntry[]>(endpoints.games.similar(gameId), { signal });
  },
};
