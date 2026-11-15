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
