import { describe, expect, it } from "vitest";

import type { LibraryRow } from "./mappers";
import { toLibraryEntry, toLibraryMembershipEntry } from "./mappers";

const row: LibraryRow = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-1",
  game_source: "rawg",
  game_id: "3498",
  game_title: "Grand Theft Auto V",
  game_slug: "grand-theft-auto-v",
  game_cover_url: "https://media.rawg.io/cover.jpg",
  status: "playing",
  platform: null,
  progress: 40,
  playtime_minutes: 125,
  added_at: new Date("2026-11-01T10:00:00.000Z"),
  last_played_at: new Date("2026-11-02T12:00:00.000Z"),
  updated_at: new Date("2026-11-03T09:30:00.000Z"),
};

describe("library mappers", () => {
  it("maps snake_case rows to the camelCase entry contract", () => {
    expect(toLibraryEntry(row)).toEqual({
      id: row.id,
      gameId: "3498",
      gameSource: "rawg",
      gameTitle: "Grand Theft Auto V",
      gameSlug: "grand-theft-auto-v",
      gameCoverUrl: "https://media.rawg.io/cover.jpg",
      status: "playing",
      platform: undefined,
      playtimeMinutes: 125,
      progress: 40,
      addedAt: "2026-11-01T10:00:00.000Z",
      lastPlayedAt: "2026-11-02T12:00:00.000Z",
      updatedAt: "2026-11-03T09:30:00.000Z",
    });
  });

  it("omits lastPlayedAt when the game was never played", () => {
    const entry = toLibraryEntry({ ...row, last_played_at: null });
    expect(entry.lastPlayedAt).toBeUndefined();
  });

  it("maps membership rows without leaking user data", () => {
    expect(toLibraryMembershipEntry(row)).toEqual({
      entryId: row.id,
      gameId: "3498",
      gameSource: "rawg",
      status: "playing",
    });
  });
});
