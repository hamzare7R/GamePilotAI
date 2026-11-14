import type { CustomGame } from "@/types/custom-game";

/**
 * First owner-authored entry. Images stay empty on purpose: the storefront falls
 * back to the shared placeholder until the owner uploads/links real artwork.
 */
export function freeFireSeed(): CustomGame {
  return {
    id: "custom-free-fire",
    name: "Free Fire",
    slug: "free-fire",
    description:
      "Free Fire is a free-to-play battle royale shooter developed by 111dots Studio and published by Garena. Matches drop dozens of players onto an island where they scavenge weapons, vehicles and supplies and fight to be the last squad standing.",
    coverUrl: "",
    heroUrl: "",
    developer: "111dots Studio",
    publisher: "Garena",
    releaseDate: "2017-12-04",
    genres: ["shooter", "multiplayer"],
    platforms: ["android", "ios"],
    websiteUrl: "https://ff.garena.com/",
    trailerUrl: "",
    screenshots: [],
    status: "published",
    source: "custom",
    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z",
  };
}
