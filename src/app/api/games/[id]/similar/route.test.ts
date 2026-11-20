import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/catalog/service", () => ({
  getSimilarGames: vi.fn(),
}));

import { CatalogNotFoundError } from "@/server/catalog/errors";
import { getSimilarGames } from "@/server/catalog/service";
import type { GameCatalogEntry } from "@/types/catalog";

import { GET } from "./route";

const getSimilarGamesMock = vi.mocked(getSimilarGames);

function request(id: string) {
  return GET(new Request(`http://localhost/api/games/${id}/similar`), {
    params: Promise.resolve({ id }),
  });
}

const entry: GameCatalogEntry = {
  id: "28",
  slug: "red-dead-redemption-2",
  title: "Red Dead Redemption 2",
  coverUrl: "https://media.rawg.io/media/games/red-dead.jpg",
  tagline: "Action · Adventure",
  description: "",
  developer: "Rockstar Games",
  publisher: "",
  platforms: ["playstation", "xbox", "pc"],
  genres: ["action", "adventure", "open-world"],
  releaseDate: "2018-10-26",
  rating: 9,
  source: "rawg",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/games/[id]/similar", () => {
  it("rejects malformed game ids before calling the service", async () => {
    const response = await request("bad id!");
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_GAME_ID");
    expect(getSimilarGamesMock).not.toHaveBeenCalled();
  });

  it("returns recommendations without caching", async () => {
    getSimilarGamesMock.mockResolvedValue([entry]);

    const response = await request("3498");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([entry]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 404 for a game that is not in the catalog", async () => {
    getSimilarGamesMock.mockRejectedValue(new CatalogNotFoundError());

    const response = await request("3498");
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error.code).toBe("GAME_NOT_FOUND");
  });

  it("reports RAWG failures as retryable catalog errors", async () => {
    getSimilarGamesMock.mockRejectedValue(new Error("RAWG responded with 403"));

    const response = await request("3498");
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error.code).toBe("CATALOG_UNAVAILABLE");
  });
});
