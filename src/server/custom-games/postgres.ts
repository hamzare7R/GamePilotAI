import { Pool } from "pg";

import type { CustomGame } from "@/types/custom-game";

import { freeFireSeed } from "./seed";
import type { CustomGameRepository } from "./types";

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

const globalPool = globalThis as typeof globalThis & { __gamepilotPgPool?: Pool };

function getPool() {
  if (!globalPool.__gamepilotPgPool) {
    globalPool.__gamepilotPgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalPool.__gamepilotPgPool;
}

let ready: Promise<void> | null = null;

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const pool = getPool();
      await pool.query(CREATE_TABLE);
      const seed = freeFireSeed();
      await pool.query(
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
      ready = null;
      throw error;
    });
  }

  return ready;
}

export const postgresCustomGameRepository: CustomGameRepository = {
  async list() {
    await ensureReady();
    const result = await getPool().query<CustomGameRow>(
      `SELECT ${COLUMNS} FROM custom_games ORDER BY created_at DESC`,
    );
    return result.rows.map(toCustomGame);
  },

  async find(id) {
    await ensureReady();
    const result = await getPool().query<CustomGameRow>(
      `SELECT ${COLUMNS} FROM custom_games WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ? toCustomGame(result.rows[0]) : null;
  },

  async findBySlug(slug) {
    await ensureReady();
    const result = await getPool().query<CustomGameRow>(
      `SELECT ${COLUMNS} FROM custom_games WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    return result.rows[0] ? toCustomGame(result.rows[0]) : null;
  },

  async insert(game) {
    await ensureReady();
    const result = await getPool().query<CustomGameRow>(
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
    );
    return toCustomGame(result.rows[0]);
  },

  async update(id, next) {
    await ensureReady();
    const result = await getPool().query<CustomGameRow>(
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
    );
    return result.rows[0] ? toCustomGame(result.rows[0]) : null;
  },

  async remove(id) {
    await ensureReady();
    const result = await getPool().query(`DELETE FROM custom_games WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  },
};
