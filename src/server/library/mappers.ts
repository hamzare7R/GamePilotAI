import type {
  GamePlatform,
  GameStatus,
  LibraryEntry,
  LibraryGameSource,
  LibraryMembershipEntry,
} from "@/types/game";

export type LibraryRow = {
  id: string;
  user_id: string;
  game_source: string;
  game_id: string;
  game_title: string;
  game_slug: string;
  game_cover_url: string;
  status: string;
  platform: string | null;
  progress: number;
  playtime_minutes: number;
  added_at: Date;
  last_played_at: Date | null;
  updated_at: Date;
};

export type LibraryMembershipRow = Pick<
  LibraryRow,
  "id" | "game_source" | "game_id" | "status"
>;

export function toLibraryEntry(row: LibraryRow): LibraryEntry {
  return {
    id: row.id,
    gameId: row.game_id,
    gameSource: row.game_source as LibraryGameSource,
    gameTitle: row.game_title,
    gameSlug: row.game_slug,
    gameCoverUrl: row.game_cover_url,
    status: row.status as GameStatus,
    platform: (row.platform as GamePlatform | null) ?? undefined,
    playtimeMinutes: row.playtime_minutes,
    progress: row.progress,
    addedAt: row.added_at.toISOString(),
    lastPlayedAt: row.last_played_at?.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toLibraryMembershipEntry(row: LibraryMembershipRow): LibraryMembershipEntry {
  return {
    entryId: row.id,
    gameId: row.game_id,
    gameSource: row.game_source as LibraryGameSource,
    status: row.status as GameStatus,
  };
}
