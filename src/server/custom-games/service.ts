import { randomUUID } from "node:crypto";

import { filterGames } from "@/lib/catalog";
import {
  customGameToCatalogEntry,
  normalizeGameTitle,
  slugifyGameName,
} from "@/lib/custom-game";
import type { CustomGameInputSchema } from "@/lib/custom-game-schema";
import type { CatalogFilters, GameCatalogEntry } from "@/types/catalog";
import type { CustomGame, CustomGameStatus } from "@/types/custom-game";

import { isRawgConfigured, rawgFetch } from "../rawg/client";
import type { RawgListResponse } from "../rawg/types";
import { getCustomGameRepository } from "./repository";
import { DuplicateCustomGameError } from "./types";

type NormalizedInput = Omit<
  CustomGame,
  "id" | "slug" | "source" | "createdAt" | "updatedAt"
>;

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeInput(input: CustomGameInputSchema): NormalizedInput {
  return {
    name: clean(input.name),
    description: clean(input.description),
    coverUrl: clean(input.coverUrl),
    heroUrl: clean(input.heroUrl),
    developer: clean(input.developer),
    publisher: clean(input.publisher),
    releaseDate: clean(input.releaseDate) || undefined,
    rating: input.rating,
    genres: Array.from(new Set(input.genres)),
    platforms: Array.from(new Set(input.platforms)),
    websiteUrl: clean(input.websiteUrl),
    trailerUrl: clean(input.trailerUrl),
    screenshots: input.screenshots.map((url) => url.trim()).filter(Boolean),
    status: input.status,
  };
}

async function uniqueSlug(base: string, excludeId?: string) {
  const repo = getCustomGameRepository();
  const candidate = slugifyGameName(base) || "game";

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const slug = attempt === 1 ? candidate : `${candidate}-${attempt}`;
    const existing = await repo.findBySlug(slug);
    if (!existing || existing.id === excludeId) return slug;
  }

  return `${candidate}-${Date.now().toString(36)}`;
}

/**
 * Rejects titles that already exist as a custom entry or as an exact RAWG match,
 * so the unified catalog never shows the same game twice.
 */
async function assertNoDuplicate(name: string, excludeId?: string) {
  const repo = getCustomGameRepository();
  const normalized = normalizeGameTitle(name);
  if (!normalized) return;

  const customGames = await repo.list();
  const customHit = customGames.find(
    (game) => game.id !== excludeId && normalizeGameTitle(game.name) === normalized,
  );
  if (customHit) {
    throw new DuplicateCustomGameError(
      `“${customHit.name}” is already a custom entry. Edit it instead of adding a duplicate.`,
      "name",
      "custom",
    );
  }

  if (!isRawgConfigured()) return;

  try {
    const response = await rawgFetch<RawgListResponse>(
      "/games",
      { search: name, page_size: 10 },
      { revalidate: 0 },
    );
    const rawgHit = response.results.find(
      (game) => normalizeGameTitle(game.name) === normalized,
    );
    if (rawgHit) {
      throw new DuplicateCustomGameError(
        `“${rawgHit.name}” already exists in RAWG, so it is already in the catalog.`,
        "name",
        "rawg",
      );
    }
  } catch (error) {
    if (error instanceof DuplicateCustomGameError) throw error;
    // A RAWG outage must not block the owner from saving a custom entry.
    console.warn(
      "[custom-games] RAWG duplicate check skipped:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function listCustomGamesForAdmin(params: {
  search?: string;
  status?: CustomGameStatus | "all";
}) {
  const games = await getCustomGameRepository().list();
  const query = params.search?.trim().toLowerCase() ?? "";

  return games.filter((game) => {
    if (params.status && params.status !== "all" && game.status !== params.status) return false;
    if (!query) return true;
    const haystack = [game.name, game.slug, game.developer, game.publisher]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function getCustomGameForAdmin(id: string) {
  return getCustomGameRepository().find(id);
}

export async function listPublishedCustomEntries(
  filters: CatalogFilters,
): Promise<GameCatalogEntry[]> {
  const games = await getCustomGameRepository().list();
  const published = games
    .filter((game) => game.status === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(customGameToCatalogEntry);

  return filterGames(published, filters);
}

export async function getPublishedCustomGame(id: string) {
  const game = await getCustomGameRepository().find(id);
  if (!game || game.status !== "published") return null;
  return game;
}

export async function getCustomGameDetailEntries(game: CustomGame): Promise<GameCatalogEntry[]> {
  const games = await getCustomGameRepository().list();
  return games
    .filter(
      (candidate) =>
        candidate.id !== game.id &&
        candidate.status === "published" &&
        (candidate.genres.some((genre) => game.genres.includes(genre)) ||
          candidate.platforms.some((platform) => game.platforms.includes(platform))),
    )
    .slice(0, 6)
    .map(customGameToCatalogEntry);
}

export async function createCustomGame(input: CustomGameInputSchema) {
  const repo = getCustomGameRepository();
  const normalized = normalizeInput(input);
  const slug = await uniqueSlug(input.slug?.trim() || normalized.name);
  await assertNoDuplicate(normalized.name);

  const now = new Date().toISOString();
  const game: CustomGame = {
    ...normalized,
    id: `custom-${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    slug,
    source: "custom",
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await repo.insert(game);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new DuplicateCustomGameError("Another custom game already uses that slug.", "slug", "custom");
    }
    throw error;
  }
}

export async function updateCustomGame(id: string, patch: Partial<CustomGameInputSchema>) {
  const repo = getCustomGameRepository();
  const existing = await repo.find(id);
  if (!existing) return null;

  const merged = normalizeInput({
    name: patch.name ?? existing.name,
    slug: patch.slug ?? existing.slug,
    description: patch.description ?? existing.description,
    coverUrl: patch.coverUrl ?? existing.coverUrl,
    heroUrl: patch.heroUrl ?? existing.heroUrl,
    developer: patch.developer ?? existing.developer,
    publisher: patch.publisher ?? existing.publisher,
    releaseDate: patch.releaseDate ?? existing.releaseDate ?? "",
    rating: patch.rating ?? existing.rating,
    genres: patch.genres ?? existing.genres,
    platforms: patch.platforms ?? existing.platforms,
    websiteUrl: patch.websiteUrl ?? existing.websiteUrl,
    trailerUrl: patch.trailerUrl ?? existing.trailerUrl,
    screenshots: patch.screenshots ?? existing.screenshots,
    status: (patch.status ?? existing.status) as CustomGameStatus,
  });

  const slugInput = patch.slug?.trim();
  const slug =
    slugInput && slugInput !== existing.slug
      ? await uniqueSlug(slugInput, id)
      : existing.slug;

  if (merged.name !== existing.name || slug !== existing.slug) {
    await assertNoDuplicate(merged.name, id);
  }

  try {
    return await repo.update(id, {
      ...existing,
      ...merged,
      slug,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new DuplicateCustomGameError("Another custom game already uses that slug.", "slug", "custom");
    }
    throw error;
  }
}

export function deleteCustomGame(id: string) {
  return getCustomGameRepository().remove(id);
}
