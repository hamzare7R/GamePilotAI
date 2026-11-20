export type GamePlatform =
  | "pc"
  | "playstation"
  | "xbox"
  | "switch"
  | "android"
  | "ios"
  | "cloud";

export type GameGenre =
  | "action"
  | "adventure"
  | "rpg"
  | "shooter"
  | "strategy"
  | "sports"
  | "racing"
  | "simulation"
  | "horror"
  | "puzzle"
  | "mmo"
  | "indie"
  | "survival"
  | "open-world"
  | "multiplayer"
  | "other";

export type GameStatus = "backlog" | "playing" | "completed" | "dropped";

export type LibraryGameSource = "rawg" | "custom" | "mock";

export const LIBRARY_STATUSES = ["backlog", "playing", "completed", "dropped"] as const;

export const LIBRARY_DEFAULT_PAGE_SIZE = 20;
export const LIBRARY_MAX_PAGE_SIZE = 40;
export const LIBRARY_MAX_PAGE = 1000;

export type Game = {
  id: string;
  slug: string;
  title: string;
  coverUrl?: string;
  platforms: GamePlatform[];
  genres: GameGenre[];
  releaseDate?: string;
  rating?: number;
  playtimeMinutes?: number;
};

export type LibraryEntry = {
  id: string;
  gameId: string;
  gameSource: LibraryGameSource;
  gameTitle: string;
  gameSlug: string;
  gameCoverUrl: string;
  game?: Game;
  status: GameStatus;
  platform?: GamePlatform;
  playtimeMinutes: number;
  progress: number;
  addedAt: string;
  lastPlayedAt?: string;
  updatedAt: string;
};

export type LibraryMembershipEntry = {
  entryId: string;
  gameId: string;
  gameSource: LibraryGameSource;
  status: GameStatus;
};

export type ListGamesParams = {
  query?: string;
  platform?: GamePlatform;
  genre?: GameGenre;
  page?: number;
  pageSize?: number;
};

export type ListLibraryParams = {
  status?: GameStatus;
  search?: string;
  platform?: GamePlatform;
  page?: number;
  pageSize?: number;
};

export type AddLibraryEntryInput = {
  gameId: string;
  platform?: GamePlatform;
  status?: GameStatus;
};

export type UpdateLibraryEntryInput = {
  status?: GameStatus;
  platform?: GamePlatform | null;
  progress?: number;
  playtimeMinutes?: number;
};
