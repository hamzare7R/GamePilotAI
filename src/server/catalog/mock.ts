import { catalogGames } from "@/data/games";
import { filterGames } from "@/lib/catalog";
import { normalizeGameTitle } from "@/lib/custom-game";
import type {
  CatalogAvailability,
  CatalogPage,
  CatalogQueryParams,
  CatalogSections,
  GameCatalogEntry,
  GameDetailResult,
} from "@/types/catalog";

import { CatalogNotFoundError } from "./errors";

const RECENT_WINDOW_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

function sortByPopularity(games: readonly GameCatalogEntry[]) {
  return [...games].sort((a, b) => {
    const rankA = a.trendingRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.trendingRank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return (b.playersOnline ?? 0) - (a.playersOnline ?? 0);
  });
}

function withSource(game: GameCatalogEntry): GameCatalogEntry {
  return game.source ? game : { ...game, source: "mock" };
}

export function mockCatalogPage(
  params: CatalogQueryParams,
  extraGames: readonly GameCatalogEntry[] = [],
): CatalogPage {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(40, Math.max(1, params.pageSize ?? 20));

  const filters = {
    query: params.search?.trim() ?? "",
    platform: params.platform ?? "all",
    genre: params.genre ?? "all",
  } as const;

  // Owner-authored games lead the demo catalog so a new entry is visible right away.
  const customGames = filterGames(extraGames, filters);
  const customTitles = new Set(
    customGames.map((game) => normalizeGameTitle(game.title)),
  );
  const demoGames = sortByPopularity(filterGames(catalogGames, filters)).filter(
    (game) => !customTitles.has(normalizeGameTitle(game.title)),
  );
  const sorted = [...customGames, ...demoGames.map(withSource)];
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    source: "mock",
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function mockCatalogSections(
  availability: CatalogAvailability = "demo",
): CatalogSections {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const recentCutoff = new Date(today.getTime() - RECENT_WINDOW_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  const featuredRaw = catalogGames.find((game) => game.featured) ?? catalogGames[0] ?? null;
  const featured = featuredRaw ? withSource(featuredRaw) : null;
  const trending = sortByPopularity(catalogGames.filter((game) => game.trendingRank))
    .slice(0, 8)
    .map(withSource);
  const popular = [...catalogGames]
    .sort((a, b) => (b.playersOnline ?? 0) - (a.playersOnline ?? 0))
    .slice(0, 8)
    .map(withSource);
  const upcoming = catalogGames
    .filter((game) => game.releaseDate && game.releaseDate > todayIso)
    .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""))
    .slice(0, 8)
    .map(withSource);
  const recentlyReleased = catalogGames
    .filter(
      (game) =>
        game.releaseDate && game.releaseDate <= todayIso && game.releaseDate >= recentCutoff,
    )
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .slice(0, 8)
    .map(withSource);

  return {
    featured,
    trending,
    popular,
    upcoming,
    recentlyReleased,
    source: "mock",
    availability,
  };
}

export function mockGameDetail(gameId: string): GameDetailResult {
  const game = catalogGames.find((entry) => entry.id === gameId || entry.slug === gameId);
  if (!game) throw new CatalogNotFoundError();

  const similar = catalogGames
    .filter(
      (entry) =>
        entry.id !== game.id &&
        (entry.genres.some((genre) => game.genres.includes(genre)) ||
          entry.platforms.some((platform) => game.platforms.includes(platform))),
    )
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  return { game: withSource(game), similar: similar.map(withSource), source: "mock" };
}
