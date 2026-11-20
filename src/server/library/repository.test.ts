import type { Pool } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/pool", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/pool")>();
  return { ...actual, getPool: vi.fn() };
});

import { DatabaseUnavailableError, getPool } from "@/server/db/pool";

import { LibraryNotReadyError } from "./errors";
import { listLibraryEntries, listLibraryMembership } from "./repository";

const getPoolMock = vi.mocked(getPool);

const row = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "user-1",
  game_source: "rawg",
  game_id: "3498",
  game_title: "Grand Theft Auto V",
  game_slug: "grand-theft-auto-v",
  game_cover_url: "https://media.rawg.io/cover.jpg",
  status: "backlog",
  platform: "pc",
  progress: 10,
  playtime_minutes: 120,
  added_at: new Date("2026-11-01T10:00:00.000Z"),
  last_played_at: null,
  updated_at: new Date("2026-11-02T10:00:00.000Z"),
};

function poolWith(query: ReturnType<typeof vi.fn>) {
  return { query } as unknown as Pool;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("library repository failure mapping", () => {
  it("maps a missing library table to storage-not-initialized", async () => {
    getPoolMock.mockReturnValue(
      poolWith(vi.fn().mockRejectedValue(Object.assign(new Error("missing"), { code: "42P01" }))),
    );

    await expect(listLibraryEntries("user-1")).rejects.toBeInstanceOf(LibraryNotReadyError);
  });

  it("maps connection failures to a database outage", async () => {
    getPoolMock.mockReturnValue(
      poolWith(
        vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("connect failed"), { code: "ECONNREFUSED" })),
      ),
    );

    await expect(listLibraryMembership("user-1")).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });

  it("rethrows unrelated query errors unchanged", async () => {
    const error = Object.assign(new Error("undefined column"), { code: "42703" });
    getPoolMock.mockReturnValue(poolWith(vi.fn().mockRejectedValue(error)));

    await expect(listLibraryMembership("user-1")).rejects.toBe(error);
  });
});

describe("library repository queries", () => {
  it("scopes the membership query to the current user", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: row.id, game_source: "rawg", game_id: "3498", status: "backlog" }],
    });
    getPoolMock.mockReturnValue(poolWith(query));

    const membership = await listLibraryMembership("user-1");

    expect(membership).toEqual([
      { entryId: row.id, gameId: "3498", gameSource: "rawg", status: "backlog" },
    ]);
    expect(query.mock.calls[0][0]).toContain("WHERE user_id = $1");
    expect(query.mock.calls[0][1]).toEqual(["user-1"]);
  });

  it("returns mapped entries with pagination for a healthy database", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [row] });
    getPoolMock.mockReturnValue(poolWith(query));

    const page = await listLibraryEntries("user-1", { page: 1, pageSize: 12 });

    expect(page.pagination).toMatchObject({ page: 1, pageSize: 12, total: 1, totalPages: 1 });
    expect(page.items[0]).toMatchObject({
      id: row.id,
      gameId: "3498",
      gameSource: "rawg",
      gameTitle: "Grand Theft Auto V",
      status: "backlog",
      platform: "pc",
      addedAt: "2026-11-01T10:00:00.000Z",
    });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
