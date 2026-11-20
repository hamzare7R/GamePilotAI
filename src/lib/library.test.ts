import { describe, expect, it } from "vitest";

import {
  allowsMockLibraryEntries,
  describeMembershipFailure,
  escapeLikePattern,
  formatPlaytime,
  isRetryableLibraryError,
  libraryMembershipKey,
  librarySearchPattern,
  libraryStatusLabels,
  libraryStatusOrder,
  removeLibraryMembershipEntry,
  resolveLibraryGameSource,
  resolveLibraryLoadError,
  setLibraryMembershipStatus,
  upsertLibraryMembership,
  type LibraryMembershipMap,
} from "@/lib/library";
import {
  addLibraryEntrySchema,
  libraryListQuerySchema,
  updateLibraryEntrySchema,
} from "@/lib/library-schema";
import type { LibraryMembershipEntry } from "@/types/game";

describe("library helpers", () => {
  it("keeps the approved status set in a stable order", () => {
    expect(libraryStatusOrder).toEqual(["backlog", "playing", "completed", "dropped"]);
    expect(Object.keys(libraryStatusLabels)).toEqual([...libraryStatusOrder]);
  });

  it("resolves the catalog source without relying on catalog metadata alone", () => {
    expect(resolveLibraryGameSource({ id: "3498", source: "rawg" })).toBe("rawg");
    expect(resolveLibraryGameSource({ id: "custom-abc123" })).toBe("custom");
    expect(resolveLibraryGameSource({ id: "g-03" })).toBe("mock");
  });

  it("builds a stable membership key", () => {
    expect(libraryMembershipKey("custom", "custom-abc123")).toBe("custom:custom-abc123");
  });

  it("formats whole-minute playtime", () => {
    expect(formatPlaytime(0)).toBe("No playtime yet");
    expect(formatPlaytime(45)).toBe("45m");
    expect(formatPlaytime(180)).toBe("3h");
    expect(formatPlaytime(200)).toBe("3h 20m");
  });

  it("escapes LIKE wildcards before building a search pattern", () => {
    expect(escapeLikePattern("100%_done")).toBe("100\\%\\_done");
    expect(librarySearchPattern("  gta  ")).toBe("%gta%");
  });

  it("only forbids mock entries in production", () => {
    expect(allowsMockLibraryEntries("production")).toBe(false);
    expect(allowsMockLibraryEntries("development")).toBe(true);
    expect(allowsMockLibraryEntries("test")).toBe(true);
  });
});

describe("library schemas", () => {
  it("accepts only the four Library statuses in list queries", () => {
    expect(libraryListQuerySchema.safeParse({ status: "wishlist" }).success).toBe(false);
    expect(libraryListQuerySchema.safeParse({ status: "playing" }).success).toBe(true);
    expect(libraryListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(libraryListQuerySchema.safeParse({ pageSize: "41" }).success).toBe(false);
  });

  it("defaults new entries to backlog and rejects unknown fields", () => {
    const parsed = addLibraryEntrySchema.parse({ gameId: " 3498 " });
    expect(parsed).toEqual({ gameId: "3498", status: "backlog" });
    expect(addLibraryEntrySchema.safeParse({ gameId: "3498", playtimeMinutes: 10 }).success).toBe(
      false,
    );
    expect(addLibraryEntrySchema.safeParse({ gameId: "bad id!" }).success).toBe(false);
  });

  it("requires at least one update field and allows clearing the platform", () => {
    expect(updateLibraryEntrySchema.safeParse({}).success).toBe(false);
    expect(updateLibraryEntrySchema.safeParse({ progress: 101 }).success).toBe(false);
    expect(updateLibraryEntrySchema.safeParse({ playtimeMinutes: -1 }).success).toBe(false);
    expect(updateLibraryEntrySchema.parse({ platform: null })).toEqual({ platform: null });
  });
});

describe("library load error states", () => {
  it("keeps a missing table separate from a temporary outage", () => {
    const storage = resolveLibraryLoadError("LIBRARY_STORAGE_NOT_INITIALIZED");
    const database = resolveLibraryLoadError("DATABASE_UNAVAILABLE");

    expect(storage.kind).toBe("storage");
    expect(storage.canRetry).toBe(false);
    expect(database.kind).toBe("database");
    expect(database.canRetry).toBe(true);
    expect(database.title).not.toBe(storage.title);
    expect(database.description).not.toBe(storage.description);
  });

  it("falls back to a retryable generic state", () => {
    expect(resolveLibraryLoadError("LIBRARY_REQUEST_FAILED")).toMatchObject({
      kind: "generic",
      canRetry: true,
    });
    expect(resolveLibraryLoadError(undefined).canRetry).toBe(true);
  });
});

describe("membership failure classification", () => {
  it("distinguishes an expired session from a temporary outage", () => {
    expect(describeMembershipFailure(null)).toBeNull();
    expect(describeMembershipFailure({ status: 401 })).toEqual({ kind: "session" });
    expect(describeMembershipFailure({ status: 503 })).toEqual({ kind: "temporary" });
    expect(describeMembershipFailure(new Error("network down"))).toEqual({ kind: "temporary" });
    expect(describeMembershipFailure({ status: 500 })).toEqual({ kind: "unknown" });
  });

  it("reports a missing library table as storage, not as an outage", () => {
    expect(
      describeMembershipFailure({ status: 503, code: "LIBRARY_STORAGE_NOT_INITIALIZED" }),
    ).toEqual({ kind: "storage" });
    expect(describeMembershipFailure({ status: 503, code: "DATABASE_UNAVAILABLE" })).toEqual({
      kind: "temporary",
    });
  });
});

describe("library request retry policy", () => {
  it("retries outages but not missing storage or auth problems", () => {
    expect(isRetryableLibraryError(new Error("network down"))).toBe(true);
    expect(isRetryableLibraryError({ status: 503, code: "DATABASE_UNAVAILABLE" })).toBe(true);
    expect(isRetryableLibraryError({ status: 500 })).toBe(true);
    expect(isRetryableLibraryError({ status: 503, code: "LIBRARY_STORAGE_NOT_INITIALIZED" })).toBe(
      false,
    );
    expect(isRetryableLibraryError({ status: 401 })).toBe(false);
    expect(isRetryableLibraryError({ status: 404 })).toBe(false);
  });
});

describe("membership cache helpers", () => {
  const rawgEntry: LibraryMembershipEntry = {
    entryId: "entry-1",
    gameId: "3498",
    gameSource: "rawg",
    status: "backlog",
  };
  const mockEntry: LibraryMembershipEntry = {
    entryId: "entry-2",
    gameId: "g-01",
    gameSource: "mock",
    status: "playing",
  };
  const rawgKey = libraryMembershipKey(rawgEntry.gameSource, rawgEntry.gameId);
  const mockKey = libraryMembershipKey(mockEntry.gameSource, mockEntry.gameId);
  const completeMap = (): LibraryMembershipMap =>
    new Map<string, LibraryMembershipEntry>([
      [rawgKey, rawgEntry],
      [mockKey, mockEntry],
    ]);

  it("never turns an unknown cache into a partial map", () => {
    expect(upsertLibraryMembership(undefined, rawgEntry)).toBeUndefined();
    expect(removeLibraryMembershipEntry(undefined, rawgEntry.entryId)).toBeUndefined();
    expect(setLibraryMembershipStatus(undefined, rawgEntry.entryId, "playing")).toBeUndefined();
  });

  it("upserts an entry without dropping the others", () => {
    const next = upsertLibraryMembership(completeMap(), { ...rawgEntry, status: "playing" });

    expect(next?.size).toBe(2);
    expect(next?.get(rawgKey)?.status).toBe("playing");
    expect(next?.get(mockKey)).toEqual(mockEntry);
  });

  it("removes only the target entry", () => {
    const next = removeLibraryMembershipEntry(completeMap(), rawgEntry.entryId);

    expect(next?.has(rawgKey)).toBe(false);
    expect(next?.get(mockKey)).toEqual(mockEntry);
  });

  it("updates status without touching other games", () => {
    const next = setLibraryMembershipStatus(completeMap(), mockEntry.entryId, "completed");

    expect(next?.get(mockKey)?.status).toBe("completed");
    expect(next?.get(rawgKey)).toEqual(rawgEntry);
  });
});
