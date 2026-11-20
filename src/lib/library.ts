import type { GameCatalogEntry } from "@/types/catalog";
import {
  LIBRARY_STATUSES,
  type GameStatus,
  type LibraryGameSource,
  type LibraryMembershipEntry,
} from "@/types/game";

export const libraryStatusOrder = LIBRARY_STATUSES;

export const libraryStatusLabels: Record<GameStatus, string> = {
  backlog: "Backlog",
  playing: "Playing",
  completed: "Completed",
  dropped: "Dropped",
};

export function resolveLibraryGameSource(
  game: Pick<GameCatalogEntry, "id" | "source">,
): LibraryGameSource {
  if (game.source) return game.source;
  if (game.id.startsWith("custom-")) return "custom";
  if (game.id.startsWith("g-")) return "mock";
  return "rawg";
}

export function libraryMembershipKey(source: LibraryGameSource, gameId: string) {
  return `${source}:${gameId}`;
}

export function formatPlaytime(minutes: number) {
  const safeMinutes = Math.max(0, Math.trunc(minutes));
  if (safeMinutes === 0) return "No playtime yet";

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function librarySearchPattern(value: string) {
  const normalized = value.trim();
  return normalized ? `%${escapeLikePattern(normalized)}%` : "";
}

export function allowsMockLibraryEntries(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== "production";
}

export type LibraryLoadErrorKind = "database" | "storage" | "generic";

export type LibraryLoadErrorState = {
  kind: LibraryLoadErrorKind;
  title: string;
  description: string;
  canRetry: boolean;
};

export function resolveLibraryLoadError(code: string | undefined): LibraryLoadErrorState {
  if (code === "LIBRARY_STORAGE_NOT_INITIALIZED") {
    return {
      kind: "storage",
      title: "Library storage is not ready",
      description:
        "The library database table has not been initialized on this deployment. Adding and listing games will work once the approved schema step is completed.",
      canRetry: false,
    };
  }

  if (code === "DATABASE_UNAVAILABLE") {
    return {
      kind: "database",
      title: "Your library is temporarily unavailable",
      description:
        "The database did not respond, so your saved games cannot be loaded right now. Nothing was lost — try again in a moment.",
      canRetry: true,
    };
  }

  return {
    kind: "generic",
    title: "Your library is unavailable",
    description: "The library did not respond. Please try again in a moment.",
    canRetry: true,
  };
}

export type MembershipFailureKind = "session" | "storage" | "temporary" | "unknown";

export type MembershipFailure = { kind: MembershipFailureKind };

export function describeMembershipFailure(error: unknown): MembershipFailure | null {
  if (!error) return null;

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;

  if (status === 401) return { kind: "session" };
  if (code === "LIBRARY_STORAGE_NOT_INITIALIZED") return { kind: "storage" };
  if (code === "DATABASE_UNAVAILABLE" || status === 503 || status === undefined) {
    return { kind: "temporary" };
  }
  return { kind: "unknown" };
}

/**
 * A missing table or a rejected session will not recover by itself; only
 * outages and unexpected failures are worth another automatic attempt.
 */
export function isRetryableLibraryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;

  const status = (error as { status?: unknown }).status;
  if (typeof status !== "number") return true;

  if (status === 400 || status === 401 || status === 403 || status === 404) return false;

  const code = (error as { code?: unknown }).code;
  return code !== "LIBRARY_STORAGE_NOT_INITIALIZED";
}

export type LibraryMembershipMap = Map<string, LibraryMembershipEntry>;

export function upsertLibraryMembership(
  membership: LibraryMembershipMap | undefined,
  entry: LibraryMembershipEntry,
): LibraryMembershipMap | undefined {
  if (!membership) return undefined;

  const next = new Map(membership);
  next.set(libraryMembershipKey(entry.gameSource, entry.gameId), entry);
  return next;
}

export function removeLibraryMembershipEntry(
  membership: LibraryMembershipMap | undefined,
  entryId: string,
): LibraryMembershipMap | undefined {
  if (!membership) return undefined;

  const next = new Map(membership);
  let changed = false;
  for (const [key, value] of next) {
    if (value.entryId === entryId) {
      next.delete(key);
      changed = true;
    }
  }
  return changed ? next : membership;
}

export function setLibraryMembershipStatus(
  membership: LibraryMembershipMap | undefined,
  entryId: string,
  status: GameStatus,
): LibraryMembershipMap | undefined {
  if (!membership) return undefined;

  let next: LibraryMembershipMap | null = null;
  for (const [key, value] of membership) {
    if (value.entryId !== entryId) continue;
    next ??= new Map(membership);
    next.set(key, { ...value, status });
  }
  return next ?? membership;
}
