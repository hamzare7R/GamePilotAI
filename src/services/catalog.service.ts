import { catalogGames } from "@/data/games";
import type { GameCatalogEntry } from "@/types/catalog";

/**
 * Mock-backed catalog service. It mirrors the async shape of `gamesService`
 * so the page can switch to `gamesService.list()` without touching the UI.
 */
export const catalogService = {
  async listAll(): Promise<readonly GameCatalogEntry[]> {
    return catalogGames;
  },

  async featured(): Promise<GameCatalogEntry | undefined> {
    return catalogGames.find((game) => game.featured) ?? catalogGames[0];
  },
};
