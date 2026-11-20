import type { CatalogQueryParams } from "@/types/catalog";
import type { ListGamesParams, ListLibraryParams } from "@/types/game";

export const queryKeys = {
  games: {
    all: ["games"] as const,
    list: (params: ListGamesParams = {}) => [...queryKeys.games.all, "list", params] as const,
    detail: (gameId: string) => [...queryKeys.games.all, "detail", gameId] as const,
  },
  catalog: {
    all: ["catalog"] as const,
    search: (params: CatalogQueryParams = {}) =>
      [...queryKeys.catalog.all, "search", params] as const,
    detail: (gameId: string) => [...queryKeys.catalog.all, "detail", gameId] as const,
  },
  library: {
    all: ["library"] as const,
    list: (params: ListLibraryParams = {}) => [...queryKeys.library.all, "list", params] as const,
    membership: () => [...queryKeys.library.all, "membership"] as const,
  },
  player: {
    all: ["player"] as const,
    profile: () => [...queryKeys.player.all, "profile"] as const,
    stats: () => [...queryKeys.player.all, "stats"] as const,
    preferences: () => [...queryKeys.player.all, "preferences"] as const,
  },
  coach: {
    all: ["coach"] as const,
    sessions: () => [...queryKeys.coach.all, "sessions"] as const,
    session: (sessionId: string) => [...queryKeys.coach.all, "session", sessionId] as const,
    recommendations: () => [...queryKeys.coach.all, "recommendations"] as const,
  },
};
