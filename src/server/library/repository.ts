import { randomUUID } from "node:crypto";

import type { Pool } from "pg";

import { librarySearchPattern } from "@/lib/library";
import {
  DatabaseUnavailableError,
  getPool,
  isDatabaseConnectionError,
} from "@/server/db/pool";
import type { Paginated } from "@/types/api";
import {
  LIBRARY_DEFAULT_PAGE_SIZE,
  LIBRARY_MAX_PAGE_SIZE,
  type GamePlatform,
  type GameStatus,
  type LibraryEntry,
  type LibraryGameSource,
  type LibraryMembershipEntry,
  type ListLibraryParams,
} from "@/types/game";

import { LibraryNotReadyError } from "./errors";
import {
  toLibraryEntry,
  toLibraryMembershipEntry,
  type LibraryMembershipRow,
  type LibraryRow,
} from "./mappers";

const LIBRARY_COLUMNS = `id, user_id, game_source, game_id, game_title, game_slug,
  game_cover_url, status, platform, progress, playtime_minutes, added_at,
  last_played_at, updated_at`;

export type NewLibraryEntry = {
  userId: string;
  gameSource: LibraryGameSource;
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  gameCoverUrl: string;
  status: GameStatus;
  platform: GamePlatform | null;
  progress: number;
  playtimeMinutes: number;
};

export type LibraryEntryUpdate = {
  status?: GameStatus;
  platform?: GamePlatform | null;
  progress?: number;
  playtimeMinutes?: number;
  touchLastPlayed?: boolean;
};

function translateError(error: unknown) {
  if ((error as { code?: unknown }).code === "42P01") {
    return new LibraryNotReadyError();
  }
  if (isDatabaseConnectionError(error)) {
    return new DatabaseUnavailableError("The library database could not be reached.");
  }
  return error;
}

async function withPool<T>(operation: (pool: Pool) => Promise<T>) {
  try {
    return await operation(getPool());
  } catch (error) {
    throw translateError(error);
  }
}

function clampPage(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value as number)) : 1;
}

function clampPageSize(value: number | undefined) {
  return Number.isFinite(value)
    ? Math.min(LIBRARY_MAX_PAGE_SIZE, Math.max(1, Math.trunc(value as number)))
    : LIBRARY_DEFAULT_PAGE_SIZE;
}

export async function listLibraryEntries(
  userId: string,
  params: ListLibraryParams = {},
): Promise<Paginated<LibraryEntry>> {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const values: (string | number)[] = [userId];
  const conditions = ["user_id = $1"];

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }

  if (params.platform) {
    values.push(params.platform);
    conditions.push(`platform = $${values.length}`);
  }

  const searchPattern = params.search ? librarySearchPattern(params.search) : "";
  if (searchPattern) {
    values.push(searchPattern);
    conditions.push(`game_title ILIKE $${values.length} ESCAPE '\\'`);
  }

  const where = conditions.join(" AND ");
  const offset = (page - 1) * pageSize;

  return withPool(async (pool) => {
    const countResult = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total
         FROM user_library_entries
        WHERE ${where}`,
      values,
    );

    const rows = await pool.query<LibraryRow>(
      `SELECT ${LIBRARY_COLUMNS}
         FROM user_library_entries
        WHERE ${where}
        ORDER BY added_at DESC, id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset],
    );

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items: rows.rows.map(toLibraryEntry),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  });
}

export async function findLibraryEntryByGame(
  userId: string,
  gameSource: LibraryGameSource,
  gameId: string,
): Promise<LibraryEntry | null> {
  return withPool(async (pool) => {
    const result = await pool.query<LibraryRow>(
      `SELECT ${LIBRARY_COLUMNS}
         FROM user_library_entries
        WHERE user_id = $1 AND game_source = $2 AND game_id = $3
        LIMIT 1`,
      [userId, gameSource, gameId],
    );

    return result.rows[0] ? toLibraryEntry(result.rows[0]) : null;
  });
}

export async function insertLibraryEntry(
  input: NewLibraryEntry,
): Promise<{ entry: LibraryEntry; created: boolean }> {
  const result = await withPool((pool) =>
    pool.query<LibraryRow>(
      `INSERT INTO user_library_entries
         (id, user_id, game_source, game_id, game_title, game_slug,
          game_cover_url, status, platform, progress, playtime_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id, game_source, game_id) DO NOTHING
       RETURNING ${LIBRARY_COLUMNS}`,
      [
        randomUUID(),
        input.userId,
        input.gameSource,
        input.gameId,
        input.gameTitle,
        input.gameSlug,
        input.gameCoverUrl,
        input.status,
        input.platform,
        input.progress,
        input.playtimeMinutes,
      ],
    ),
  );

  const row = result.rows[0];
  if (row) return { entry: toLibraryEntry(row), created: true };

  const existing = await findLibraryEntryByGame(
    input.userId,
    input.gameSource,
    input.gameId,
  );
  if (!existing) throw new Error("Library insert conflicted without an existing entry.");
  return { entry: existing, created: false };
}

export async function updateLibraryEntry(
  userId: string,
  entryId: string,
  patch: LibraryEntryUpdate,
): Promise<LibraryEntry | null> {
  const values: (string | number | null)[] = [entryId, userId];
  const assignments: string[] = [];

  if (patch.status !== undefined) {
    values.push(patch.status);
    assignments.push(`status = $${values.length}`);
  }
  if (patch.platform !== undefined) {
    values.push(patch.platform);
    assignments.push(`platform = $${values.length}`);
  }
  if (patch.progress !== undefined) {
    values.push(patch.progress);
    assignments.push(`progress = $${values.length}`);
  }
  if (patch.playtimeMinutes !== undefined) {
    values.push(patch.playtimeMinutes);
    assignments.push(`playtime_minutes = $${values.length}`);
  }
  if (patch.touchLastPlayed) assignments.push("last_played_at = now()");

  assignments.push("updated_at = now()");

  return withPool(async (pool) => {
    const result = await pool.query<LibraryRow>(
      `UPDATE user_library_entries
          SET ${assignments.join(", ")}
        WHERE id = $1 AND user_id = $2
        RETURNING ${LIBRARY_COLUMNS}`,
      values,
    );

    return result.rows[0] ? toLibraryEntry(result.rows[0]) : null;
  });
}

export async function removeLibraryEntry(userId: string, entryId: string): Promise<boolean> {
  return withPool(async (pool) => {
    const result = await pool.query(
      `DELETE FROM user_library_entries WHERE id = $1 AND user_id = $2`,
      [entryId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function listLibraryMembership(userId: string): Promise<LibraryMembershipEntry[]> {
  return withPool(async (pool) => {
    const result = await pool.query<LibraryMembershipRow>(
      `SELECT id, game_source, game_id, status
         FROM user_library_entries
        WHERE user_id = $1
        ORDER BY added_at DESC, id DESC`,
      [userId],
    );

    return result.rows.map(toLibraryMembershipEntry);
  });
}
