import { CustomGameStoreUnavailableError } from "@/server/custom-games/types";

const POSTGRES_SCHEMES = new Set(["postgres:", "postgresql:"]);

// Values people paste into a dashboard field instead of an actual URL.
const PLACEHOLDER_HOSTS = new Set([
  "base",
  "host",
  "hostname",
  "host-name",
  "your-host",
  "your-database-host",
  "your-db-host",
  "database",
  "database-host",
  "db-host",
  "url",
  "database-url",
  "connection-string",
  "example.com",
  "example.org",
]);

// Preferred order: explicit app variable first, then the names provisioned by
// the Vercel Postgres / Neon integrations.
export const DATABASE_URL_VARIABLES = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

export type DatabaseConfig = {
  url: string;
  source: (typeof DATABASE_URL_VARIABLES)[number];
};

type Parsed =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function unwrapQuotes(value: string) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);
  if (first && last && first === last && (first === '"' || first === "'")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Validates a Postgres connection string without ever echoing its credentials.
 * `pg-connection-string` accepts bare strings (e.g. "base") and turns them into
 * a hostname, which surfaces as `getaddrinfo ENOTFOUND base` at query time.
 */
export function parsePostgresUrl(value: string): Parsed {
  const raw = unwrapQuotes(value);
  if (!raw) return { ok: false, reason: "is empty" };
  if (/\s/.test(raw)) return { ok: false, reason: "contains whitespace" };

  if (/^\$?\{?[A-Z][A-Z0-9_]*\}?$/.test(raw)) {
    return { ok: false, reason: "looks like an environment variable name, not a connection string" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "is not a valid URL" };
  }

  if (!POSTGRES_SCHEMES.has(parsed.protocol)) {
    return { ok: false, reason: "must start with postgres:// or postgresql://" };
  }

  const host = parsed.hostname.trim().toLowerCase();
  if (!host) return { ok: false, reason: "has no hostname" };
  if (PLACEHOLDER_HOSTS.has(host)) {
    return {
      ok: false,
      reason: `points at the placeholder host "${host}" instead of a reachable database host`,
    };
  }

  return { ok: true, url: raw };
}

/**
 * Reads env vars lazily (not at module load) so the configured values are the
 * ones present in the running deployment. Returns the first valid candidate and
 * a list of problems for any invalid candidate. Problems never include secrets.
 */
export function getDatabaseConfig(): { config: DatabaseConfig | null; problems: string[] } {
  const problems: string[] = [];

  for (const name of DATABASE_URL_VARIABLES) {
    const value = process.env[name];
    if (value === undefined || value.trim() === "") continue;

    const parsed = parsePostgresUrl(value);
    if (parsed.ok) {
      return { config: { url: parsed.url, source: name }, problems };
    }
    problems.push(`${name} ${parsed.reason}`);
  }

  return { config: null, problems };
}

export function databaseConfigError(problems: string[]) {
  return new CustomGameStoreUnavailableError(
    `Custom game storage is misconfigured: ${problems.join("; ")}. ` +
      "Set DATABASE_URL (or POSTGRES_URL) to the full Postgres connection string from your database provider.",
  );
}
