import { genreLabels } from "@/config/catalog";
import type { GameCatalogEntry } from "@/types/catalog";
import type { GameGenre, GamePlatform } from "@/types/game";

import type { RawgGame } from "./types";

export const RAWG_PLACEHOLDER_COVER = "/games/placeholder-cover.svg";

const TAGLINE_MAX = 130;
const DESCRIPTION_MAX = 1_200;

const genreByRawgSlug: Record<string, GameGenre> = {
  action: "action",
  indie: "indie",
  adventure: "adventure",
  "role-playing-games-rpg": "rpg",
  strategy: "strategy",
  shooter: "shooter",
  simulation: "simulation",
  puzzle: "puzzle",
  racing: "racing",
  "massively-multiplayer": "mmo",
  sports: "sports",
  fighting: "action",
  arcade: "action",
  platformer: "adventure",
  casual: "puzzle",
};

const tagByRawgSlug: Record<string, GameGenre> = {
  "open-world": "open-world",
  survival: "survival",
  horror: "horror",
  "survival-horror": "horror",
  multiplayer: "multiplayer",
  "online-multiplayer": "multiplayer",
};

const platformRules: { match: RegExp; platform: GamePlatform }[] = [
  { match: /playstation/i, platform: "playstation" },
  { match: /xbox/i, platform: "xbox" },
  { match: /nintendo|switch/i, platform: "switch" },
  { match: /android/i, platform: "android" },
  { match: /ios|iphone|ipad/i, platform: "ios" },
  { match: /web/i, platform: "cloud" },
  { match: /pc|mac|linux/i, platform: "pc" },
];

/**
 * RAWG's `platforms` filter accepts numeric platform IDs only. Sending slugs
 * (for example `android`) is not a valid filter and makes RAWG return an empty
 * page. IDs are taken from RAWG's own platform catalog.
 */
const platformIdsByPlatform: Record<GamePlatform, readonly number[]> = {
  pc: [4],
  playstation: [18, 187],
  xbox: [1, 186],
  switch: [7],
  android: [21],
  ios: [3],
  cloud: [171],
};

const genreFilterByGenre: Record<GameGenre, { param: "genres" | "tags"; slug: string } | null> = {
  action: { param: "genres", slug: "action" },
  adventure: { param: "genres", slug: "adventure" },
  rpg: { param: "genres", slug: "role-playing-games-rpg" },
  shooter: { param: "genres", slug: "shooter" },
  strategy: { param: "genres", slug: "strategy" },
  sports: { param: "genres", slug: "sports" },
  racing: { param: "genres", slug: "racing" },
  simulation: { param: "genres", slug: "simulation" },
  puzzle: { param: "genres", slug: "puzzle" },
  mmo: { param: "genres", slug: "massively-multiplayer" },
  indie: { param: "genres", slug: "indie" },
  horror: { param: "tags", slug: "horror" },
  survival: { param: "tags", slug: "survival" },
  "open-world": { param: "tags", slug: "open-world" },
  multiplayer: { param: "tags", slug: "multiplayer" },
  // "other" is a local display fallback; RAWG has no equivalent catalog filter.
  other: null,
};

export function rawgPlatformFilter(platform: GamePlatform) {
  return platformIdsByPlatform[platform].join(",");
}

export function rawgGenreFilter(genre: GameGenre) {
  return genreFilterByGenre[genre];
}

function uniqueGenres(genres: GameGenre[]) {
  return Array.from(new Set(genres));
}

function mapGenres(game: RawgGame): GameGenre[] {
  const fromGenres = (game.genres ?? [])
    .map((genre) => genreByRawgSlug[genre.slug])
    .filter((genre): genre is GameGenre => Boolean(genre));
  const fromTags = (game.tags ?? [])
    .map((tag) => tagByRawgSlug[tag.slug])
    .filter((genre): genre is GameGenre => Boolean(genre));

  const mapped = uniqueGenres([...fromGenres, ...fromTags]).slice(0, 4);
  return mapped.length > 0 ? mapped : ["other"];
}

function mapPlatforms(game: RawgGame): GamePlatform[] {
  const platforms = new Set<GamePlatform>();
  for (const entry of game.platforms ?? []) {
    const slug = entry.platform?.slug ?? "";
    const rule = platformRules.find((candidate) => candidate.match.test(slug));
    if (rule) platforms.add(rule.platform);
  }
  return Array.from(platforms);
}

function mapRating(rating: number | undefined): number | undefined {
  if (typeof rating !== "number" || rating <= 0) return undefined;
  return Math.round(rating * 2 * 10) / 10;
}

function cleanDescription(value?: string | null): string {
  if (!value) return "";
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= DESCRIPTION_MAX) return text;
  const cut = text.slice(0, DESCRIPTION_MAX);
  const lastStop = cut.lastIndexOf(". ");
  return `${(lastStop > 400 ? cut.slice(0, lastStop + 1) : cut).trim()}…`;
}

function firstSentence(text: string): string {
  if (!text) return "";
  const stop = text.search(/[.!?]\s/);
  const sentence = stop > 0 ? text.slice(0, stop + 1) : text;
  return sentence.length > TAGLINE_MAX ? `${sentence.slice(0, TAGLINE_MAX).trim()}…` : sentence;
}

function genreTagline(genres: GameGenre[]) {
  return genres
    .slice(0, 3)
    .map((genre) => genreLabels[genre])
    .join(" · ");
}

function validDate(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function baseEntry(game: RawgGame): GameCatalogEntry {
  const genres = mapGenres(game);

  return {
    id: String(game.id),
    slug: game.slug,
    title: game.name,
    coverUrl: game.background_image || RAWG_PLACEHOLDER_COVER,
    heroUrl: game.background_image_additional || undefined,
    tagline: genreTagline(genres),
    description: "",
    developer: game.developers?.[0]?.name ?? "",
    publisher: game.publishers?.[0]?.name ?? "",
    platforms: mapPlatforms(game),
    genres,
    releaseDate: validDate(game.released),
    rating: mapRating(game.rating),
    source: "rawg",
  };
}

export function mapRawgGame(game: RawgGame): GameCatalogEntry {
  return baseEntry(game);
}

export function mapRawgDetail(game: RawgGame): GameCatalogEntry {
  const entry = baseEntry(game);
  const description = cleanDescription(game.description_raw ?? game.description);

  return {
    ...entry,
    tagline: firstSentence(description) || entry.tagline,
    description,
    developer: game.developers?.[0]?.name ?? "",
    publisher: game.publishers?.[0]?.name ?? "",
  };
}
