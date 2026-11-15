import type { Pool } from "pg";

import { getSharedPoolState } from "@/server/db/pool";
import type { CustomGame } from "@/types/custom-game";

import { freeFireSeed } from "./seed";
import {
  CustomGameStoreUnavailableError,
  type CustomGameRepository,
} from "./types";

type CustomGameRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_url: string;
  hero_url: string;
  developer: string;
  publisher: string;
  release_date: string | null;
  rating: number | null;
  genres: string[];
  platforms: string[];
  website_url: string;
  trailer_url: string;
  screenshots: string[];
  status: string;
  created_at: Date;
  updated_at: Date;
};

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS custom_games (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text NOT NULL DEFAULT '',
    cover_url text NOT NULL DEFAULT '',
    hero_url text NOT NULL DEFAULT '',
    developer text NOT NULL DEFAULT '',
    publisher text NOT NULL DEFAULT '',
    release_date text,
    rating double precision,
    genres text[] NOT NULL DEFAULT '{}',
    platforms text[] NOT NULL DEFAULT '{}',
    website_url text NOT NULL DEFAULT '',
    trailer_url text NOT NULL DEFAULT '',
    screenshots text[] NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

const COLUMNS = `id, name, slug, description, cover_url, hero_url, developer, publisher,
  release_date, rating, genres, platforms, website_url, trailer_url, screenshots,
  status, created_at, updated_at`;

function toCustomGame(row: CustomGameRow): CustomGame {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverUrl: row.cover_url,
    heroUrl: row.hero_url,
    developer: row.developer,
    publisher: row.publisher,
    releaseDate: row.release_date ?? undefined,
    rating: row.rating ?? undefined,
    genres: row.genres as CustomGame["genres"],
    platforms: row.platforms as CustomGame["platforms"],
    websiteUrl: row.website_url,
    trailerUrl: row.trailer_url,
    screenshots: row.screenshots,
    status: row.status as CustomGame["status"],
    source: "custom",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

type ReadyState = {
  url: string;
  ready: Promise<void>;
};

const globalReady = globalThis as typeof globalThis & {
  __gamepilotCustomGamesReady?: ReadyState;
};

function getState(url: string) {
  return getSharedPoolState(url);
}

/**
 * Maps driver failures to actionable messages. The original error is only
 * logged through `describeStoreError`, which strips connection details.
 */
function translateConnectionError(error: unknown): unknown {
  if (error instanceof CustomGameStoreUnavailableError) return error;

  const code = (error as { code?: unknown }).code;
  const message = error instanceof Error ? error.message : "";

  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return new CustomGameStoreUnavailableError(
      "The database host could not be resolved. Verify the host in DATABASE_URL (or POSTGRES_URL).",
    );
  }
  if (code === "ECONNREFUSED") {
    return new CustomGameStoreUnavailableError(
      "The database refused the connection. Verify the host, port and that the database accepts external connections.",
    );
  }
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "57P01" ||
    /timeout/i.test(message)
  ) {
    return new CustomGameStoreUnavailableError(
      "The database connection timed out. Check the database status and network access.",
    );
  }
  if (code === "28P01" || code === "28000") {
    return new CustomGameStoreUnavailableError(
      "The database rejected the credentials. Verify the username and password in the connection string.",
    );
  }
  if (code === "3D000") {
    return new CustomGameStoreUnavailableError(
      "The database named in the connection string does not exist.",
    );
  }
  if (typeof code === "string" && code.startsWith("28")) {
    return new CustomGameStoreUnavailableError(
      "The database rejected the connection. Verify the credentials and SSL settings.",
    );
  }

  return error;
}

async function ensureReady(state: { url: string; pool: Pool }) {
  const cached = globalReady.__gamepilotCustomGamesReady;
  if (cached?.url === state.url) return cached.ready;

  const ready = (async () => {
    await state.pool.query(CREATE_TABLE);
    const seed = freeFireSeed();
    await state.pool.query(
      `INSERT INTO custom_games (${COLUMNS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO NOTHING`,
      [
        seed.id,
        seed.name,
        seed.slug,
        seed.description,
        seed.coverUrl,
        seed.heroUrl,
        seed.developer,
        seed.publisher,
        seed.releaseDate ?? null,
        seed.rating ?? null,
        seed.genres,
        seed.platforms,
        seed.websiteUrl,
        seed.trailerUrl,
        seed.screenshots,
        seed.status,
        seed.createdAt,
        seed.updatedAt,
      ],
    );
  })().catch((error) => {
    globalReady.__gamepilotCustomGamesReady = undefined;
    throw error;
  });

  globalReady.__gamepilotCustomGamesReady = { url: state.url, ready };
  return ready;
}

async function run<T>(url: string, query: (pool: Pool) => Promise<T>): Promise<T> {
  const state = getState(url);
  try {
    await ensureReady(state);
    return await query(state.pool);
  } catch (error) {
    throw translateConnectionError(error);
  }
}

export function createPostgresCustomGameRepository(url: string): CustomGameRepository {
  return {
    async list() {
      const result = await run(url, (pool) =>
        pool.query<CustomGameRow>(`SELECT ${COLUMNS} FROM custom_games ORDER BY created_at DESC`),
      );
      return result.rows.map(toCustomGame);
    },

    async find(id) {
      const result = await run(url, (pool) =>
        pool.query<CustomGameRow>(
          `SELECT ${COLUMNS} FROM custom_games WHERE id = $1 LIMIT 1`,
          [id],
        ),
      );
      return result.rows[0] ? toCustomGame(result.rows[0]) : null;
    },

    async findBySlug(slug) {
      const result = await run(url, (pool) =>
        pool.query<CustomGameRow>(
          `SELECT ${COLUMNS} FROM custom_games WHERE slug = $1 LIMIT 1`,
          [slug],
        ),
      );
      return result.rows[0] ? toCustomGame(result.rows[0]) : null;
    },

    async insert(game) {
      const result = await run(url, (pool) =>
        pool.query<CustomGameRow>(
          `INSERT INTO custom_games (${COLUMNS}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           RETURNING ${COLUMNS}`,
          [
            game.id,
            game.name,
            game.slug,
            game.description,
            game.coverUrl,
            game.heroUrl,
            game.developer,
            game.publisher,
            game.releaseDate ?? null,
            game.rating ?? null,
            game.genres,
            game.platforms,
            game.websiteUrl,
            game.trailerUrl,
            game.screenshots,
            game.status,
            game.createdAt,
            game.updatedAt,
          ],
        ),
      );
      return toCustomGame(result.rows[0]);
    },

    async update(id, next) {
      const result = await run(url, (pool) =>
        pool.query<CustomGameRow>(
          `UPDATE custom_games SET
             name = $2, slug = $3, description = $4, cover_url = $5, hero_url = $6,
             developer = $7, publisher = $8, release_date = $9, rating = $10,
             genres = $11, platforms = $12, website_url = $13, trailer_url = $14,
             screenshots = $15, status = $16, updated_at = now()
           WHERE id = $1
           RETURNING ${COLUMNS}`,
          [
            id,
            next.name,
            next.slug,
            next.description,
            next.coverUrl,
            next.heroUrl,
            next.developer,
            next.publisher,
            next.releaseDate ?? null,
            next.rating ?? null,
            next.genres,
            next.platforms,
            next.websiteUrl,
            next.trailerUrl,
            next.screenshots,
            next.status,
          ],
        ),
      );
      return result.rows[0] ? toCustomGame(result.rows[0]) : null;
    },

    async remove(id) {
      const result = await run(url, (pool) =>
        pool.query(`DELETE FROM custom_games WHERE id = $1`, [id]),
      );
      return (result.rowCount ?? 0) > 0;
    },
  };
}
