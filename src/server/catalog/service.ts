import {
  CATALOG_MAX_PAGE,
  CATALOG_MAX_PAGE_SIZE,
  type CatalogFilters,
  type CatalogPage,
  type CatalogQueryParams,
  type CatalogSections,
  type GameCatalogEntry,
  type GameDetailResult,
} from "@/types/catalog";

import { customGameToCatalogEntry, normalizeGameTitle } from "@/lib/custom-game";
import {
  getCustomGameDetailEntries,
  getPublishedCustomGame,
  listPublishedCustomEntries,
} from "../custom-games/service";
import { describeStoreError } from "../custom-games/types";
import { isRawgConfigured, RawgError, rawgFetch } from "../rawg/client";
import {
  mapRawgDetail,
  mapRawgGame,
  rawgGenreFilter,
  rawgPlatformFilter,
} from "../rawg/mappers";
import type { RawgGame, RawgListResponse } from "../rawg/types";
import { CatalogNotFoundError, CatalogUnavailableError } from "./errors";
import { mockCatalogPage, mockCatalogSections, mockGameDetail } from "./mock";
import { fetchSimilarGamesFromRawg } from "./similar";

const SECTION_LIMIT = 8;
const SECTION_POOL = 18;
const DAY_MS = 24 * 60 * 60 * 1000;
const RAWG_PAGE_SIZE = 40;
const CUSTOM_ID_PATTERN = /^custom-/i;

function clampPage(value: number | undefined) {
  return Number.isFinite(value)
    ? Math.min(CATALOG_MAX_PAGE, Math.max(1, Math.trunc(value as number)))
    : 1;
}

function clampPageSize(value: number | undefined) {
  return Number.isFinite(value)
    ? Math.min(CATALOG_MAX_PAGE_SIZE, Math.max(1, Math.trunc(value as number)))
    : 20;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function buildPagination(page: number, pageSize: number, total: number, hasNextPage: boolean) {
  const availablePages = Math.max(1, Math.ceil(total / pageSize));
  const totalPages = Math.min(availablePages, CATALOG_MAX_PAGE);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: hasNextPage && page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function dedupe(games: readonly GameCatalogEntry[]) {
  const seen = new Set<string>();
  return games.filter((game) => {
    if (seen.has(game.id)) return false;
    seen.add(game.id);
    return true;
  });
}

function dedupeCustomEntries(games: readonly GameCatalogEntry[]) {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  return games.filter((game) => {
    const title = normalizeGameTitle(game.title);
    if (seenIds.has(game.id) || (title.length > 0 && seenTitles.has(title))) return false;
    seenIds.add(game.id);
    if (title.length > 0) seenTitles.add(title);
    return true;
  });
}

function takeUnique(
  pool: readonly GameCatalogEntry[],
  used: Set<string>,
  limit = SECTION_LIMIT,
) {
  const picked: GameCatalogEntry[] = [];
  for (const game of pool) {
    if (used.has(game.id)) continue;
    used.add(game.id);
    picked.push(game);
    if (picked.length === limit) break;
  }
  return picked;
}

function rawgQuery(
  params: CatalogQueryParams,
  page: number,
  pageSize: number,
): Record<string, string | number | undefined> {
  const query: Record<string, string | number | undefined> = {
    page,
    page_size: pageSize,
    ordering: "-added",
  };

  const search = params.search?.trim();
  if (search) query.search = search;
  if (params.platform && params.platform !== "all") {
    query.platforms = rawgPlatformFilter(params.platform);
  }
  if (params.genre && params.genre !== "all") {
    const genre = rawgGenreFilter(params.genre);
    if (genre) query[genre.param] = genre.slug;
  }

  return query;
}

function catalogFilters(params: CatalogQueryParams): CatalogFilters {
  return {
    query: params.search?.trim() ?? "",
    platform: params.platform ?? "all",
    genre: params.genre ?? "all",
  };
}

async function safeCustomEntries(params: CatalogQueryParams): Promise<GameCatalogEntry[]> {
  try {
    return await listPublishedCustomEntries(catalogFilters(params));
  } catch (error) {
    console.warn(
      "[catalog] custom games unavailable, serving RAWG only:",
      describeStoreError(error),
    );
    return [];
  }
}

/**
 * Custom entries are prepended to the RAWG result space. RAWG's page offsets are
 * shifted by the custom count, so the rawg page is fetched at 40 items per page
 * and sliced.
 *
 * Cross-source duplicates are rejected when an owner entry is created. Filtering
 * them here would change the offset after the rawg page was chosen and could skip
 * otherwise valid RAWG results.
 */
async function fetchRawgPageMerged(
  params: CatalogQueryParams,
  customPool: readonly GameCatalogEntry[],
): Promise<CatalogPage> {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);
  const customs = dedupeCustomEntries(customPool);
  const start = (page - 1) * pageSize;
  const rawgSkip = Math.max(0, start - customs.length);
  const rawgPage = Math.floor(rawgSkip / RAWG_PAGE_SIZE) + 1;

  const response = await rawgFetch<RawgListResponse>(
    "/games",
    rawgQuery(params, rawgPage, RAWG_PAGE_SIZE),
  );
  const rawgEntries = dedupe(response.results.map(mapRawgGame));

  const items: GameCatalogEntry[] = [];
  if (start < customs.length) {
    items.push(...customs.slice(start, start + pageSize));
  }

  const remaining = pageSize - items.length;
  if (remaining > 0) {
    const offset = rawgSkip - (rawgPage - 1) * RAWG_PAGE_SIZE;
    items.push(...rawgEntries.slice(offset, offset + remaining));
  }

  const total = response.count + customs.length;

  return {
    items,
    source: "rawg",
    pagination: buildPagination(page, pageSize, total, start + pageSize < total),
  };
}

async function fetchRawgSections(): Promise<CatalogSections> {
  const today = new Date();
  const todayIso = isoDate(today);

  const [trendingResponse, popularResponse, upcomingResponse, recentResponse] =
    await Promise.all([
      rawgFetch<RawgListResponse>("/games", { ordering: "-added", page_size: SECTION_POOL }),
      rawgFetch<RawgListResponse>("/games", { ordering: "-rating", page_size: SECTION_POOL }),
      rawgFetch<RawgListResponse>("/games", {
        dates: `${todayIso},${isoDate(shiftDays(today, 550))}`,
        ordering: "released",
        page_size: SECTION_POOL,
      }),
      rawgFetch<RawgListResponse>("/games", {
        dates: `${isoDate(shiftDays(today, -90))},${todayIso}`,
        ordering: "-released",
        page_size: SECTION_POOL,
      }),
    ]);

  const trendingPool = dedupe(trendingResponse.results.map(mapRawgGame));
  const featuredSource =
    trendingPool[0] ?? dedupe(popularResponse.results.map(mapRawgGame))[0] ?? null;

  let featured: GameCatalogEntry | null = featuredSource;
  if (featuredSource) {
    try {
      featured = mapRawgDetail(await rawgFetch<RawgGame>(`/games/${featuredSource.id}`));
    } catch {
      featured = featuredSource;
    }
  }

  const used = new Set<string>();
  if (featured) used.add(featured.id);

  const trending = takeUnique(trendingPool, used);
  const popular = takeUnique(dedupe(popularResponse.results.map(mapRawgGame)), used);
  const upcoming = takeUnique(
    dedupe(
      upcomingResponse.results
        .map(mapRawgGame)
        .filter((game) => Boolean(game.releaseDate)),
    ),
    used,
  );
  const recentlyReleased = takeUnique(
    dedupe(
      recentResponse.results
        .map(mapRawgGame)
        .filter((game) => Boolean(game.releaseDate)),
    ),
    used,
  );

  if (!featured && trending.length === 0) {
    throw new CatalogUnavailableError("RAWG returned an empty catalog");
  }

  return {
    featured,
    trending,
    popular,
    upcoming,
    recentlyReleased,
    source: "rawg",
    availability: "live",
  };
}

export async function listCatalog(params: CatalogQueryParams = {}): Promise<CatalogPage> {
  const customs = await safeCustomEntries(params);

  if (!isRawgConfigured()) return mockCatalogPage(params, customs);

  try {
    return await fetchRawgPageMerged(params, customs);
  } catch (error) {
    throw error instanceof RawgError
      ? new CatalogUnavailableError(error.message)
      : new CatalogUnavailableError();
  }
}

export async function getCatalogSections(): Promise<CatalogSections> {
  if (!isRawgConfigured()) return mockCatalogSections();

  try {
    return await fetchRawgSections();
  } catch (error) {
    console.warn(
      "[catalog] RAWG unavailable, serving the bundled catalog:",
      error instanceof Error ? error.message : error,
    );
    return mockCatalogSections("fallback");
  }
}

export async function getSimilarGames(gameId: string): Promise<GameCatalogEntry[]> {
  if (CUSTOM_ID_PATTERN.test(gameId)) {
    let game = null;
    try {
      game = await getPublishedCustomGame(gameId);
    } catch (error) {
      throw new CatalogUnavailableError(
        error instanceof Error ? error.message : undefined,
      );
    }

    if (!game) throw new CatalogNotFoundError();

    return getCustomGameDetailEntries(game).catch(() => []);
  }

  if (!isRawgConfigured()) return [...mockGameDetail(gameId).similar];

  try {
    const seed = await rawgFetch<RawgGame>(`/games/${encodeURIComponent(gameId)}`);
    return await fetchSimilarGamesFromRawg(seed);
  } catch (error) {
    if (error instanceof CatalogNotFoundError) throw error;
    if (error instanceof RawgError && error.status === 404) {
      throw new CatalogNotFoundError();
    }
    throw new CatalogUnavailableError();
  }
}

export async function getGameDetail(gameId: string): Promise<GameDetailResult> {
  if (CUSTOM_ID_PATTERN.test(gameId)) {
    let game = null;
    try {
      game = await getPublishedCustomGame(gameId);
    } catch (error) {
      throw new CatalogUnavailableError(
        error instanceof Error ? error.message : undefined,
      );
    }

    if (!game) throw new CatalogNotFoundError();

    return {
      game: customGameToCatalogEntry(game),
      similar: [],
      source: "custom",
    };
  }

  if (!isRawgConfigured()) return mockGameDetail(gameId);

  try {
    const game = await rawgFetch<RawgGame>(`/games/${encodeURIComponent(gameId)}`);

    return {
      game: mapRawgDetail(game),
      // Recommendations are served by /api/games/[id]/similar so a failure
      // there never blocks the details response.
      similar: [],
      source: "rawg",
    };
  } catch (error) {
    if (error instanceof RawgError && error.status === 404) {
      throw new CatalogNotFoundError();
    }
    throw new CatalogUnavailableError();
  }
}
