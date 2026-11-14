import type { GameGenre, GamePlatform } from "./game";

export type CustomGameStatus = "published" | "draft" | "archived";

/**
 * A catalog entry authored by the site owner instead of RAWG. Custom games are
 * stored server-side and merged into the same `GameCatalogEntry` shape the
 * storefront already renders.
 */
export type CustomGame = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverUrl: string;
  heroUrl: string;
  developer: string;
  publisher: string;
  releaseDate?: string;
  rating?: number;
  genres: GameGenre[];
  platforms: GamePlatform[];
  websiteUrl: string;
  trailerUrl: string;
  screenshots: string[];
  status: CustomGameStatus;
  source: "custom";
  createdAt: string;
  updatedAt: string;
};

export type CustomGameInput = {
  name: string;
  slug?: string;
  description: string;
  coverUrl: string;
  heroUrl: string;
  developer: string;
  publisher: string;
  releaseDate?: string;
  rating?: number;
  genres: GameGenre[];
  platforms: GamePlatform[];
  websiteUrl: string;
  trailerUrl: string;
  screenshots: string[];
  status: CustomGameStatus;
};

export type CustomGameStatusFilter = CustomGameStatus | "all";

export const customGameStatusLabels: Record<CustomGameStatus, string> = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
};
