export type HealthLevel = "operational" | "degraded";

export type DatabaseCheck = {
  at: string;
  ok: boolean;
  latencyMs: number | null;
  code: string | null;
};

export const DEGRADED_LATENCY_MS = 1_000;
export const HEALTH_HISTORY_LIMIT = 20;

const KNOWN_CODES: Record<string, string> = {
  "42501": "PERMISSION_DENIED",
  "42P01": "TABLE_MISSING",
  "3D000": "DATABASE_MISSING",
  "28P01": "AUTH_FAILED",
  "28000": "AUTH_REJECTED",
  "53300": "TOO_MANY_CONNECTIONS",
  "57P03": "DATABASE_STARTING",
  "57014": "QUERY_CANCELLED",
  DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
  ENOTFOUND: "HOST_NOT_FOUND",
  EAI_AGAIN: "DNS_LOOKUP_FAILED",
  ECONNREFUSED: "CONNECTION_REFUSED",
  ECONNRESET: "CONNECTION_RESET",
  ETIMEDOUT: "CONNECTION_TIMEOUT",
};

export function classifyLatency(latencyMs: number | null): HealthLevel {
  return latencyMs !== null && latencyMs >= DEGRADED_LATENCY_MS ? "degraded" : "operational";
}

/** Returns only a provider label; the hostname and credentials never leave this function. */
export function providerLabel(connectionUrl: string) {
  try {
    const host = new URL(connectionUrl).hostname.toLowerCase();
    if (host === "neon.tech" || host.endsWith(".neon.tech")) return "Neon PostgreSQL";
  } catch {
    return "PostgreSQL";
  }
  return "PostgreSQL";
}

export function safeDatabaseErrorCode(error: unknown, fallback = "QUERY_FAILED") {
  const raw =
    error && typeof error === "object" && "code" in error
      ? (error as { code?: unknown }).code
      : null;
  if (typeof raw !== "string" || !raw) return fallback;

  const known = KNOWN_CODES[raw];
  if (known) return known;
  // Postgres SQLSTATE values are five characters; Node network errors are upper snake case.
  if (/^[0-9A-Z]{5}$/.test(raw) || /^[A-Z0-9_]{3,40}$/.test(raw)) return raw;
  return fallback;
}

export function toSafeNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function sumDefined(values: readonly (number | null)[]) {
  let total = 0;
  let seen = false;
  for (const value of values) {
    if (value === null) continue;
    total += value;
    seen = true;
  }
  return seen ? total : null;
}

export function shareOf(part: number | null, total: number | null) {
  if (part === null || total === null || total <= 0) return null;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

export function topBySize<T>(
  rows: readonly T[],
  sizeOf: (row: T) => number | null,
  limit: number,
) {
  return [...rows]
    .sort((left, right) => (sizeOf(right) ?? 0) - (sizeOf(left) ?? 0))
    .slice(0, Math.max(limit, 0));
}

export function appendHealthCheck(
  history: readonly DatabaseCheck[],
  check: DatabaseCheck,
  limit = HEALTH_HISTORY_LIMIT,
) {
  const next = [...history, check];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
