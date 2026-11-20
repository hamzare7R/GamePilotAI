import { describe, expect, it } from "vitest";

import { mapRawgGame } from "./mappers";
import type { RawgGame } from "./types";

function rawgGame(overrides: Partial<RawgGame> = {}): RawgGame {
  return {
    id: 1,
    slug: "test-game",
    name: "Test Game",
    released: "2025-01-01",
    background_image: null,
    rating: 4,
    ...overrides,
  };
}

describe("mapRawgGame", () => {
  it("does not invent a PC platform when RAWG lists none", () => {
    expect(mapRawgGame(rawgGame()).platforms).toEqual([]);
    expect(mapRawgGame(rawgGame({ platforms: [] })).platforms).toEqual([]);
  });

  it("keeps the mapped platform family from RAWG", () => {
    const game = mapRawgGame(
      rawgGame({
        platforms: [
          { platform: { id: 18, name: "PlayStation 4", slug: "playstation4" } },
        ],
      }),
    );

    expect(game.platforms).toEqual(["playstation"]);
  });

  it("maps the horror tag to the horror genre", () => {
    const game = mapRawgGame(
      rawgGame({
        genres: [],
        tags: [{ id: 1, name: "Horror", slug: "horror" }],
      }),
    );

    expect(game.genres).toContain("horror");
  });
});
