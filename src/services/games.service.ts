import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { toQuery } from "@/lib/api/query";
import type { Paginated } from "@/types/api";
import type { Game, ListGamesParams } from "@/types/game";

export const gamesService = {
  list(params: ListGamesParams = {}) {
    return apiClient.get<Paginated<Game>>(endpoints.games.list, { query: toQuery(params) });
  },

  getById(gameId: string) {
    return apiClient.get<Game>(endpoints.games.detail(gameId));
  },
};
