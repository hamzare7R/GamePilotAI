import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameDetailResult } from "@/types/catalog";
import type { LibraryEntry } from "@/types/game";

vi.mock("@/server/catalog/service", () => ({
  getGameDetail: vi.fn(),
}));

vi.mock("./repository", () => ({
  listLibraryEntries: vi.fn(),
  listLibraryMembership: vi.fn(),
  insertLibraryEntry: vi.fn(),
  updateLibraryEntry: vi.fn(),
  removeLibraryEntry: vi.fn(),
}));

import { CatalogNotFoundError } from "@/server/catalog/errors";
import { getGameDetail } from "@/server/catalog/service";

import {
  LibraryEntryNotFoundError,
  LibraryGameNotFoundError,
  MockLibraryEntryError,
} from "./errors";
import * as repository from "./repository";
import {
  addLibraryEntryForUser,
  removeLibraryEntryForUser,
  updateLibraryEntryForUser,
} from "./service";

const getGameDetailMock = vi.mocked(getGameDetail);
const insertMock = vi.mocked(repository.insertLibraryEntry);
const updateMock = vi.mocked(repository.updateLibraryEntry);
const removeMock = vi.mocked(repository.removeLibraryEntry);

const entry = {
  id: "11111111-1111-1111-1111-111111111111",
  gameId: "3498",
  gameSource: "rawg",
  gameTitle: "Grand Theft Auto V",
  gameSlug: "grand-theft-auto-v",
  gameCoverUrl: "https://media.rawg.io/cover.jpg",
  status: "backlog",
  playtimeMinutes: 0,
  progress: 0,
  addedAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
} satisfies LibraryEntry;

function detail(overrides: Partial<GameDetailResult> = {}): GameDetailResult {
  return {
    source: "rawg",
    game: {
      id: "3498",
      slug: "grand-theft-auto-v",
      title: "Grand Theft Auto V",
      coverUrl: "https://media.rawg.io/cover.jpg",
      tagline: "Welcome to Los Santos",
      description: "Open-world action.",
      developer: "Rockstar North",
      publisher: "Rockstar Games",
      platforms: ["pc"],
      genres: ["action"],
    },
    similar: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("addLibraryEntryForUser", () => {
  it("maps catalog misses to a library game-not-found error", async () => {
    getGameDetailMock.mockRejectedValue(new CatalogNotFoundError());

    await expect(
      addLibraryEntryForUser("user-1", { gameId: "999999" }),
    ).rejects.toBeInstanceOf(LibraryGameNotFoundError);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("persists catalog snapshot fields and defaults to backlog", async () => {
    getGameDetailMock.mockResolvedValue(detail());
    insertMock.mockResolvedValue({ entry, created: true });

    const result = await addLibraryEntryForUser("user-1", {
      gameId: "3498",
      platform: "pc",
    });

    expect(result).toEqual({ entry, created: true });
    expect(insertMock).toHaveBeenCalledWith({
      userId: "user-1",
      gameSource: "rawg",
      gameId: "3498",
      gameTitle: "Grand Theft Auto V",
      gameSlug: "grand-theft-auto-v",
      gameCoverUrl: "https://media.rawg.io/cover.jpg",
      status: "backlog",
      platform: "pc",
      progress: 0,
      playtimeMinutes: 0,
    });
  });

  it("starts completed entries at 100% progress", async () => {
    getGameDetailMock.mockResolvedValue(detail());
    insertMock.mockResolvedValue({ entry, created: true });

    await addLibraryEntryForUser("user-1", { gameId: "3498", status: "completed" });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", progress: 100 }),
    );
  });

  it("blocks mock catalog games in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getGameDetailMock.mockResolvedValue(detail({ source: "mock" }));

    await expect(
      addLibraryEntryForUser("user-1", { gameId: "g-01" }),
    ).rejects.toBeInstanceOf(MockLibraryEntryError);
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("updateLibraryEntryForUser", () => {
  it("forces completed entries to 100% progress", async () => {
    updateMock.mockResolvedValue({ ...entry, status: "completed", progress: 100 });

    await updateLibraryEntryForUser("user-1", entry.id, { status: "completed" });

    expect(updateMock).toHaveBeenCalledWith("user-1", entry.id, {
      status: "completed",
      progress: 100,
      touchLastPlayed: false,
    });
  });

  it("records last-played time when switching to playing", async () => {
    updateMock.mockResolvedValue({ ...entry, status: "playing" });

    await updateLibraryEntryForUser("user-1", entry.id, { status: "playing" });

    expect(updateMock).toHaveBeenCalledWith("user-1", entry.id, {
      status: "playing",
      touchLastPlayed: true,
    });
  });

  it("throws when the entry is missing or belongs to another user", async () => {
    updateMock.mockResolvedValue(null);

    await expect(
      updateLibraryEntryForUser("user-1", entry.id, { progress: 50 }),
    ).rejects.toBeInstanceOf(LibraryEntryNotFoundError);
  });
});

describe("removeLibraryEntryForUser", () => {
  it("throws when nothing was deleted", async () => {
    removeMock.mockResolvedValue(false);

    await expect(removeLibraryEntryForUser("user-1", entry.id)).rejects.toBeInstanceOf(
      LibraryEntryNotFoundError,
    );
  });

  it("resolves when the scoped delete succeeded", async () => {
    removeMock.mockResolvedValue(true);

    await expect(removeLibraryEntryForUser("user-1", entry.id)).resolves.toBeUndefined();
    expect(removeMock).toHaveBeenCalledWith("user-1", entry.id);
  });
});
