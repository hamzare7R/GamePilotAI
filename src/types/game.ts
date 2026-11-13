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
  | "other";

export type GameStatus = "backlog" | "playing" | "completed" | "dropped" | "wishlist";

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
  game?: Game;
  status: GameStatus;
  platform: GamePlatform;
  hoursPlayed: number;
  progress: number;
  addedAt: string;
  lastPlayedAt?: string;
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
  page?: number;
  pageSize?: number;
};

export type AddLibraryEntryInput = {
  gameId: string;
  platform: GamePlatform;
  status?: GameStatus;
};

export type UpdateLibraryEntryInput = Partial<Pick<LibraryEntry, "status" | "platform" | "progress">>;
