import { Pool } from "pg";

import { getDatabaseConfig } from "./config";

type PoolState = {
  url: string;
  pool: Pool;
};

const globalStore = globalThis as typeof globalThis & {
  __gamepilotPg?: PoolState;
};

export class DatabaseUnavailableError extends Error {
  readonly code = "DATABASE_UNAVAILABLE";

  constructor(message: string) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

const DATABASE_CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "57P01",
  "57P02",
  "57P03",
  "53300",
]);

/**
 * `getPool()` only fails when configuration is missing; a configured but
 * unreachable database rejects at query time with a socket or SQLSTATE code.
 */
export function isDatabaseConnectionError(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && DATABASE_CONNECTION_CODES.has(code);
}

/**
 * One pool per validated URL, reused across route handlers and builds so
 * serverless invocations do not open a new connection per request.
 */
export function getSharedPoolState(url: string): PoolState {
  const existing = globalStore.__gamepilotPg;
  if (existing?.url === url) return existing;

  if (existing) void existing.pool.end().catch(() => undefined);

  const pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "gamepilot-ai",
  });
  pool.on("error", (error) => {
    // Never surface the connection string; the code is enough to diagnose.
    const code = (error as { code?: unknown }).code;
    console.error("[db] idle client error:", typeof code === "string" ? code : "unknown");
  });

  const state: PoolState = { url, pool };
  globalStore.__gamepilotPg = state;
  return state;
}

export function isDatabaseConfigured() {
  return getDatabaseConfig().config !== null;
}

export function getPool(): Pool {
  const { config, problems } = getDatabaseConfig();
  if (!config) {
    throw new DatabaseUnavailableError(
      problems.length > 0
        ? `Database is misconfigured: ${problems.join("; ")}.`
        : "Database is not configured. Set DATABASE_URL.",
    );
  }
  return getSharedPoolState(config.url).pool;
}
