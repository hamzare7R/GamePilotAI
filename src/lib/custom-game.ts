import { genreLabels } from "@/config/catalog";
import type { GameCatalogEntry } from "@/types/catalog";
import type { CustomGame } from "@/types/custom-game";

export const CUSTOM_PLACEHOLDER_COVER = "/games/placeholder-cover.svg";
export const CUSTOM_PLACEHOLDER_HERO = "/games/placeholder-hero.svg";

const TAGLINE_MAX = 130;

export function normalizeGameTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

export function slugifyGameName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function firstSentence(text: string) {
  if (!text) return "";
  const stop = text.search(/[.!?]\s/);
  const sentence = stop > 0 ? text.slice(0, stop + 1) : text;
  return sentence.length > TAGLINE_MAX ? `${sentence.slice(0, TAGLINE_MAX).trim()}…` : sentence;
}

export function customGameToCatalogEntry(game: CustomGame): GameCatalogEntry {
  const description = game.description.trim();
  const genreTagline = game.genres
    .slice(0, 3)
    .map((genre) => genreLabels[genre])
    .join(" · ");

  return {
    id: game.id,
    slug: game.slug,
    title: game.name,
    coverUrl: game.coverUrl || CUSTOM_PLACEHOLDER_COVER,
    heroUrl: game.heroUrl || undefined,
    screenshots: game.screenshots.length > 0 ? [...game.screenshots] : undefined,
    tagline: firstSentence(description) || genreTagline,
    description,
    developer: game.developer,
    publisher: game.publisher,
    platforms: game.platforms.length > 0 ? game.platforms : ["pc"],
    genres: game.genres.length > 0 ? game.genres : ["other"],
    releaseDate: game.releaseDate,
    rating: game.rating,
    source: "custom",
  };
}
