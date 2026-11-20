import { allowsMockLibraryEntries } from "@/lib/library";
import { CatalogNotFoundError } from "@/server/catalog/errors";
import { getGameDetail } from "@/server/catalog/service";
import type { GameDetailResult } from "@/types/catalog";
import type {
  AddLibraryEntryInput,
  LibraryEntry,
  ListLibraryParams,
  UpdateLibraryEntryInput,
} from "@/types/game";

import {
  LibraryEntryNotFoundError,
  LibraryGameNotFoundError,
  MockLibraryEntryError,
} from "./errors";
import {
  insertLibraryEntry,
  listLibraryEntries,
  listLibraryMembership,
  removeLibraryEntry,
  updateLibraryEntry as updateLibraryEntryRecord,
} from "./repository";

export async function listLibraryForUser(
  userId: string,
  params: ListLibraryParams = {},
) {
  return listLibraryEntries(userId, params);
}

export function listLibraryMembershipForUser(userId: string) {
  return listLibraryMembership(userId);
}

export async function addLibraryEntryForUser(
  userId: string,
  input: AddLibraryEntryInput,
): Promise<{ entry: LibraryEntry; created: boolean }> {
  let detail: GameDetailResult;

  try {
    detail = await getGameDetail(input.gameId);
  } catch (error) {
    if (error instanceof CatalogNotFoundError) throw new LibraryGameNotFoundError();
    throw error;
  }

  if (detail.source === "mock" && !allowsMockLibraryEntries()) {
    throw new MockLibraryEntryError();
  }

  const status = input.status ?? "backlog";

  return insertLibraryEntry({
    userId,
    gameSource: detail.source,
    gameId: detail.game.id,
    gameTitle: detail.game.title,
    gameSlug: detail.game.slug,
    gameCoverUrl: detail.game.coverUrl,
    status,
    platform: input.platform ?? null,
    progress: status === "completed" ? 100 : 0,
    playtimeMinutes: 0,
  });
}

export async function updateLibraryEntryForUser(
  userId: string,
  entryId: string,
  input: UpdateLibraryEntryInput,
): Promise<LibraryEntry> {
  const patch = { ...input };

  if (patch.status === "completed" && patch.progress === undefined) {
    patch.progress = 100;
  }

  const entry = await updateLibraryEntryRecord(userId, entryId, {
    ...patch,
    touchLastPlayed:
      patch.status === "playing" ||
      (patch.playtimeMinutes !== undefined && patch.playtimeMinutes > 0),
  });

  if (!entry) throw new LibraryEntryNotFoundError();
  return entry;
}

export async function removeLibraryEntryForUser(
  userId: string,
  entryId: string,
): Promise<void> {
  const removed = await removeLibraryEntry(userId, entryId);
  if (!removed) throw new LibraryEntryNotFoundError();
}
