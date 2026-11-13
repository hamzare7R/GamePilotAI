import type { Game, GameGenre, GamePlatform } from "./game";

/**
 * Storefront-facing view of a game: everything in `Game` plus the copy and
 * merchandising fields the discovery UI needs. Kept separate from `Game` so the
 * catalog API can evolve without widening the core domain model.
 */
export type GameCatalogEntry = Omit<Game, "coverUrl"> & {
  coverUrl: string;
  tagline: string;
  description: string;
  developer: string;
  publisher: string;
  heroUrl?: string;
  featured?: boolean;
  trendingRank?: number;
  playersOnline?: number;
};

export type PlatformFilter = GamePlatform | "all";
export type GenreFilter = GameGenre | "all";

export type CatalogFilters = {
  query: string;
  platform: PlatformFilter;
  genre: GenreFilter;
};

export const emptyCatalogFilters: CatalogFilters = {
  query: "",
  platform: "all",
  genre: "all",
};
