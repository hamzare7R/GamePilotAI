import type { Paginated } from "./api";
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
  /** Owner-authored screenshot URLs, rendered in the details dialog. */
  screenshots?: string[];
  featured?: boolean;
  trendingRank?: number;
  playersOnline?: number;
  /** Per-game provenance so the UI can flag owner-authored entries. */
  source?: CatalogSource;
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

/** Where a catalog entry/response came from: RAWG, the bundled demo set, or the owner. */
export type CatalogSource = "rawg" | "mock" | "custom";

export type CatalogQueryParams = {
  search?: string;
  platform?: PlatformFilter;
  genre?: GenreFilter;
  page?: number;
  pageSize?: number;
};

export type CatalogPage = Paginated<GameCatalogEntry> & {
  source: CatalogSource;
};

export type CatalogSections = {
  featured: GameCatalogEntry | null;
  trending: readonly GameCatalogEntry[];
  popular: readonly GameCatalogEntry[];
  upcoming: readonly GameCatalogEntry[];
  recentlyReleased: readonly GameCatalogEntry[];
  source: CatalogSource;
};

export type GameDetailResult = {
  game: GameCatalogEntry;
  similar: readonly GameCatalogEntry[];
  source: CatalogSource;
};
