const RAWG_BASE_URL =
  process.env.RAWG_API_BASE_URL?.trim().replace(/\/+$/, "") || "https://api.rawg.io/api";
const RAWG_REVALIDATE_SECONDS = 60 * 60;
const RAWG_TIMEOUT_MS = 10_000;

export type RawgQuery = Record<string, string | number | boolean | undefined>;

export type RawgFetchOptions = {
  /** Per-request override; pass 0 for data that must not be served stale. */
  revalidate?: number;
};

export class RawgError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "RawgError";
    this.status = status;
  }
}

export function isRawgConfigured() {
  return Boolean(process.env.RAWG_API_KEY?.trim());
}

/**
 * Server-only RAWG client. The API key never leaves the server: every browser
 * request goes through `/api/games`, never directly to rawg.io.
 */
export async function rawgFetch<T>(
  path: string,
  query: RawgQuery = {},
  options: RawgFetchOptions = {},
): Promise<T> {
  const apiKey = process.env.RAWG_API_KEY?.trim();
  if (!apiKey) {
    throw new RawgError("RAWG_API_KEY is not configured", 503);
  }

  const url = new URL(path.replace(/^\/+/, ""), `${RAWG_BASE_URL}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: options.revalidate ?? RAWG_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(RAWG_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new RawgError(timedOut ? "RAWG request timed out" : "RAWG request failed", timedOut ? 504 : 502);
  }

  if (!response.ok) {
    throw new RawgError(`RAWG responded with ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}
