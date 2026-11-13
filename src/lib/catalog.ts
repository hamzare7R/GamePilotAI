import { genreLabels, platformMeta } from "@/config/catalog";
import type { CatalogFilters, GameCatalogEntry } from "@/types/catalog";

const NEW_RELEASE_WINDOW_DAYS = 45;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isNewRelease(game: GameCatalogEntry, now = new Date()) {
  if (!game.releaseDate) return false;
  const released = Date.parse(`${game.releaseDate}T00:00:00Z`);
  if (Number.isNaN(released)) return false;
  const age = now.getTime() - released;
  return age >= 0 && age <= NEW_RELEASE_WINDOW_DAYS * DAY_MS;
}

export function formatReleaseDate(releaseDate?: string) {
  if (!releaseDate) return "TBA";
  const date = new Date(`${releaseDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatPlayers(count?: number) {
  if (!count) return null;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count);
}

export function describeGameTags(game: GameCatalogEntry) {
  return game.genres.map((genre) => genreLabels[genre]).join(" · ");
}

export function filterGames(games: readonly GameCatalogEntry[], filters: CatalogFilters) {
  const query = filters.query.trim().toLowerCase();

  return games.filter((game) => {
    if (filters.platform !== "all" && !game.platforms.includes(filters.platform)) return false;
    if (filters.genre !== "all" && !game.genres.includes(filters.genre)) return false;
    if (!query) return true;

    const haystack = [
      game.title,
      game.tagline,
      game.description,
      game.developer,
      game.publisher,
      ...game.genres.map((genre) => genreLabels[genre]),
      ...game.platforms.map((platform) => platformMeta[platform].label),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function hasActiveFilters(filters: CatalogFilters) {
  return filters.query.trim().length > 0 || filters.platform !== "all" || filters.genre !== "all";
}

const SECTION_SIZE = 4;

export function getGameSections(games: readonly GameCatalogEntry[]) {
  const trending = [...games]
    .filter((game) => game.trendingRank !== undefined)
    .sort((a, b) => (a.trendingRank ?? 0) - (b.trendingRank ?? 0))
    .slice(0, SECTION_SIZE);

  const trendingIds = new Set(trending.map((game) => game.id));

  const newReleases = [...games]
    .filter((game) => !trendingIds.has(game.id))
    .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .slice(0, SECTION_SIZE);

  const shownIds = new Set([...trending, ...newReleases].map((game) => game.id));
  const more = games.filter((game) => !shownIds.has(game.id));

  return { trending, newReleases, more };
}

export function countGamesByPlatform(games: readonly GameCatalogEntry[]) {
  const counts = new Map<string, number>();
  for (const game of games) {
    for (const platform of game.platforms) {
      counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
  }
  return counts;
}
