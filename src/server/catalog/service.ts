import type {
  CatalogPage,
  CatalogQueryParams,
  CatalogSections,
  GameCatalogEntry,
  GameDetailResult,
} from "@/types/catalog";

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

const SECTION_LIMIT = 8;
const SECTION_POOL = 18;
const DAY_MS = 24 * 60 * 60 * 1000;

function clampPage(value: number | undefined) {
  return Number.isFinite(value) ? Math.min(100, Math.max(1, Math.trunc(value as number))) : 1;
}

function clampPageSize(value: number | undefined) {
  return Number.isFinite(value)
    ? Math.min(40, Math.max(1, Math.trunc(value as number)))
    : 20;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function buildPagination(page: number, pageSize: number, total: number, hasNextPage: boolean) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    hasNextPage,
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

async function fetchRawgPage(params: CatalogQueryParams): Promise<CatalogPage> {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(params.pageSize);

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

  const response = await rawgFetch<RawgListResponse>("/games", query);

  return {
    items: dedupe(response.results.map(mapRawgGame)),
    source: "rawg",
    pagination: buildPagination(page, pageSize, response.count, Boolean(response.next)),
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

  return { featured, trending, popular, upcoming, recentlyReleased, source: "rawg" };
}

export async function listCatalog(params: CatalogQueryParams = {}): Promise<CatalogPage> {
  if (!isRawgConfigured()) return mockCatalogPage(params);

  try {
    return await fetchRawgPage(params);
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
    return mockCatalogSections();
  }
}

export async function getGameDetail(gameId: string): Promise<GameDetailResult> {
  if (!isRawgConfigured()) return mockGameDetail(gameId);

  try {
    const game = await rawgFetch<RawgGame>(`/games/${encodeURIComponent(gameId)}`);
    const suggested = await rawgFetch<RawgListResponse>(
      `/games/${encodeURIComponent(gameId)}/suggested`,
      { page_size: 6 },
    ).catch(() => null);

    return {
      game: mapRawgDetail(game),
      similar: suggested ? dedupe(suggested.results.map(mapRawgGame)).slice(0, 6) : [],
      source: "rawg",
    };
  } catch (error) {
    if (error instanceof RawgError && error.status === 404) {
      throw new CatalogNotFoundError();
    }
    throw new CatalogUnavailableError();
  }
}
