import { normalizeGameTitle } from "@/lib/custom-game";
import type { GameCatalogEntry } from "@/types/catalog";
import type { GamePlatform } from "@/types/game";

import { rawgFetch, type RawgQuery } from "../rawg/client";
import { mapRawgGame } from "../rawg/mappers";
import type { RawgGame, RawgListResponse } from "../rawg/types";

const CANDIDATE_PAGE_SIZE = 40;
const MAX_GENRE_FILTERS = 3;
const MAX_PLATFORM_FILTERS = 3;

const GENRE_WEIGHT = 6;
const GENRE_TAG_WEIGHT = 3;
const PLATFORM_WEIGHT = 2;
const MAX_PLATFORM_SCORE = 8;
const TAG_WEIGHT = 1;
const MAX_TAG_SCORE = 5;
const DEVELOPER_WEIGHT = 4;

/** RAWG tags that the catalog already surfaces as genres. */
const GENRE_TAG_SLUGS = new Set([
  "open-world",
  "survival",
  "survival-horror",
  "horror",
  "online-multiplayer",
  "multiplayer",
]);

export const SIMILAR_LIMIT = 6;

export type SimilarityTraits = {
  id: string;
  slug: string;
  title: string;
  genreIds: number[];
  genreTagIds: number[];
  tagIds: number[];
  platformFamilies: GamePlatform[];
  developerIds: number[];
  rating: number;
  added: number;
};

export type SimilarityScore = {
  total: number;
  genreScore: number;
  platformScore: number;
  sharedGenres: number;
  sharedPlatforms: number;
};

function uniqueNumbers(values: readonly number[]) {
  return Array.from(new Set(values));
}

function countShared<T>(left: readonly T[], right: readonly T[]) {
  const rightSet = new Set(right);
  return left.reduce((count, value) => (rightSet.has(value) ? count + 1 : count), 0);
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Traits come from the RAWG game payload itself (genre/tag/platform/developer
 * IDs and slugs), never from guessed slugs or model names.
 */
export function extractTraits(game: RawgGame): SimilarityTraits {
  const tags = game.tags ?? [];

  return {
    id: String(game.id),
    slug: game.slug,
    title: normalizeGameTitle(game.name),
    genreIds: uniqueNumbers((game.genres ?? []).map((genre) => genre.id)),
    genreTagIds: uniqueNumbers(
      tags.filter((tag) => GENRE_TAG_SLUGS.has(tag.slug)).map((tag) => tag.id),
    ),
    tagIds: uniqueNumbers(tags.map((tag) => tag.id)),
    platformFamilies: mapRawgGame(game).platforms,
    developerIds: uniqueNumbers((game.developers ?? []).map((developer) => developer.id)),
    rating: finite(game.rating),
    added: finite(game.added),
  };
}

export function scoreSimilarity(seed: SimilarityTraits, candidate: SimilarityTraits): SimilarityScore {
  const sharedGenres = countShared(seed.genreIds, candidate.genreIds);
  const sharedGenreTags = countShared(seed.genreTagIds, candidate.genreTagIds);
  const sharedPlatforms = countShared(seed.platformFamilies, candidate.platformFamilies);
  const sharedTags = countShared(seed.tagIds, candidate.tagIds);
  const sharedDevelopers = countShared(seed.developerIds, candidate.developerIds);

  const genreScore = sharedGenres * GENRE_WEIGHT + sharedGenreTags * GENRE_TAG_WEIGHT;
  const platformScore = Math.min(sharedPlatforms * PLATFORM_WEIGHT, MAX_PLATFORM_SCORE);
  const tagScore = Math.min(sharedTags * TAG_WEIGHT, MAX_TAG_SCORE);
  const developerScore = sharedDevelopers > 0 ? DEVELOPER_WEIGHT : 0;

  return {
    total: genreScore + platformScore + tagScore + developerScore,
    genreScore,
    platformScore,
    sharedGenres,
    sharedPlatforms,
  };
}

/**
 * Genres must overlap when the seed has genre data. Only for seeds without any
 * genre signal may shared platforms alone qualify a candidate.
 */
function hasPrimarySimilarity(seed: SimilarityTraits, score: SimilarityScore) {
  if (seed.genreIds.length > 0 || seed.genreTagIds.length > 0) return score.genreScore > 0;
  return score.sharedPlatforms > 0;
}

/**
 * Genres decide relevance; a shared platform alone is not a recommendation.
 * Rating and RAWG `added` counts only break ties, so famous titles never
 * outrank titles that actually share genres.
 */
export function rankSimilarGames(
  seed: RawgGame,
  candidates: readonly RawgGame[],
  limit = SIMILAR_LIMIT,
): GameCatalogEntry[] {
  const seedTraits = extractTraits(seed);
  const seenIds = new Set<string>([seedTraits.id]);
  const seenSlugs = new Set<string>(seedTraits.slug ? [seedTraits.slug] : []);
  const seenTitles = new Set<string>(seedTraits.title ? [seedTraits.title] : []);

  const scored: {
    game: RawgGame;
    traits: SimilarityTraits;
    score: SimilarityScore;
  }[] = [];

  for (const candidate of candidates) {
    const traits = extractTraits(candidate);
    if (seenIds.has(traits.id)) continue;
    if (traits.slug && seenSlugs.has(traits.slug)) continue;
    if (traits.title && seenTitles.has(traits.title)) continue;

    const score = scoreSimilarity(seedTraits, traits);
    if (score.total <= 0 || !hasPrimarySimilarity(seedTraits, score)) continue;

    seenIds.add(traits.id);
    if (traits.slug) seenSlugs.add(traits.slug);
    if (traits.title) seenTitles.add(traits.title);
    scored.push({ game: candidate, traits, score });
  }

  scored.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (b.score.genreScore !== a.score.genreScore) {
      return b.score.genreScore - a.score.genreScore;
    }
    if (b.score.platformScore !== a.score.platformScore) {
      return b.score.platformScore - a.score.platformScore;
    }
    if (b.traits.rating !== a.traits.rating) return b.traits.rating - a.traits.rating;
    if (b.traits.added !== a.traits.added) return b.traits.added - a.traits.added;
    return a.game.name.localeCompare(b.game.name);
  });

  return scored
    .slice(0, Math.max(1, limit))
    .map(({ game }) => mapRawgGame(game));
}

/**
 * Candidate pages are requested with the seed's real RAWG genre IDs. When the
 * seed has no genres, its real platform IDs are used instead of guessing.
 */
export function buildCandidateQueries(seed: RawgGame): RawgQuery[] {
  const genreIds = uniqueNumbers((seed.genres ?? []).map((genre) => genre.id)).slice(
    0,
    MAX_GENRE_FILTERS,
  );
  const platformIds = uniqueNumbers(
    (seed.platforms ?? []).map((entry) => entry.platform.id),
  ).slice(0, MAX_PLATFORM_FILTERS);

  if (genreIds.length > 0) {
    const genres = genreIds.join(",");
    return [
      { genres, ordering: "-rating", page_size: CANDIDATE_PAGE_SIZE },
      { genres, ordering: "-added", page_size: CANDIDATE_PAGE_SIZE },
    ];
  }

  if (platformIds.length > 0) {
    return [
      {
        platforms: platformIds.join(","),
        ordering: "-rating",
        page_size: CANDIDATE_PAGE_SIZE,
      },
    ];
  }

  return [];
}

export async function fetchSimilarGamesFromRawg(seed: RawgGame): Promise<GameCatalogEntry[]> {
  const queries = buildCandidateQueries(seed);
  if (queries.length === 0) return [];

  const settled = await Promise.allSettled(
    queries.map((query) => rawgFetch<RawgListResponse>("/games", query)),
  );

  const candidates = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value.results : [],
  );

  if (candidates.length === 0) {
    const failure = settled.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) throw failure.reason;
    return [];
  }

  return rankSimilarGames(seed, candidates);
}
