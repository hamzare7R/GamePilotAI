import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../rawg/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../rawg/client")>();
  return { ...actual, rawgFetch: vi.fn() };
});

import { RawgError, rawgFetch } from "../rawg/client";
import { mapRawgGame } from "../rawg/mappers";
import type { RawgGame, RawgListResponse } from "../rawg/types";
import {
  buildCandidateQueries,
  extractTraits,
  fetchSimilarGamesFromRawg,
  rankSimilarGames,
  scoreSimilarity,
} from "./similar";

const action = { id: 4, name: "Action", slug: "action" };
const adventure = { id: 3, name: "Adventure", slug: "adventure" };
const rpg = { id: 5, name: "RPG", slug: "role-playing-games-rpg" };
const shooter = { id: 2, name: "Shooter", slug: "shooter" };
const racing = { id: 14, name: "Racing", slug: "racing" };
const sports = { id: 15, name: "Sports", slug: "sports" };

const openWorld = { id: 31, name: "Open World", slug: "open-world" };
const multiplayer = { id: 7, name: "Multiplayer", slug: "multiplayer" };
const crime = { id: 999, name: "Crime", slug: "crime" };

const ps4 = { platform: { id: 18, name: "PlayStation 4", slug: "playstation4" } };
const ps5 = { platform: { id: 187, name: "PlayStation 5", slug: "playstation5" } };
const xboxOne = { platform: { id: 1, name: "Xbox One", slug: "xbox-one" } };
const pc = { platform: { id: 4, name: "PC", slug: "pc" } };
const switchConsole = { platform: { id: 7, name: "Nintendo Switch", slug: "nintendo-switch" } };

const rockstarNorth = { id: 101, name: "Rockstar North", slug: "rockstar-north" };
const rockstarGames = { id: 102, name: "Rockstar Games", slug: "rockstar-games" };
const playground = { id: 201, name: "Playground Games", slug: "playground-games" };

function rawgGame(overrides: Partial<RawgGame> & Pick<RawgGame, "id" | "name">): RawgGame {
  return {
    slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    released: "2020-01-01",
    background_image: null,
    rating: 4,
    ...overrides,
  };
}

const gta = rawgGame({
  id: 3498,
  name: "Grand Theft Auto V",
  genres: [action, adventure],
  tags: [openWorld, multiplayer, crime],
  platforms: [ps4, xboxOne, pc],
  developers: [rockstarNorth],
  rating: 4.47,
  added: 21000,
});

const redDead2 = rawgGame({
  id: 28,
  name: "Red Dead Redemption 2",
  genres: [action, adventure],
  tags: [openWorld, multiplayer],
  platforms: [ps4, xboxOne, pc],
  developers: [rockstarGames],
  rating: 4.47,
  added: 18000,
});

const watchDogs = rawgGame({
  id: 5070,
  name: "Watch Dogs",
  genres: [action, adventure],
  tags: [openWorld],
  platforms: [ps4, xboxOne, pc],
  rating: 3.8,
  added: 9000,
});

const cyberpunk = rawgGame({
  id: 1091500,
  name: "Cyberpunk 2077",
  genres: [rpg, shooter],
  tags: [openWorld],
  platforms: [ps5, pc],
  rating: 4.3,
  added: 30000,
});

const fifa = rawgGame({
  id: 4000,
  name: "FIFA 23",
  genres: [sports],
  platforms: [ps4, xboxOne],
  rating: 3.5,
  added: 25000,
});

describe("similar game ranking", () => {
  it("scores genres before platforms and tags", () => {
    const score = scoreSimilarity(extractTraits(gta), extractTraits(redDead2));

    expect(score.sharedGenres).toBe(2);
    expect(score.sharedPlatforms).toBe(3);
    expect(score.genreScore).toBe(18); // two genres + Open World and Multiplayer tags
    expect(score.platformScore).toBe(6);
    expect(score.total).toBe(18 + 6 + 2 + 0); // + shared tags (Open World, Multiplayer)
  });

  it("excludes the current game, duplicate titles, and platform-only matches", () => {
    const self = rawgGame({ id: 3498, name: "GTA V Remastered", genres: [action] });
    const duplicateTitle = rawgGame({
      id: 99999,
      name: "Grand Theft Auto: V",
      genres: [action, adventure],
      platforms: [ps4],
    });
    const duplicateSlug = rawgGame({
      id: 77777,
      name: "GTA 5",
      slug: "grand-theft-auto-v",
      genres: [action, adventure],
      platforms: [ps4],
    });

    const result = rankSimilarGames(gta, [
      cyberpunk,
      fifa,
      watchDogs,
      redDead2,
      self,
      duplicateTitle,
      duplicateSlug,
      redDead2,
    ]);

    expect(result.map((game) => game.id)).toEqual(["28", "5070", "1091500"]);
    expect(result.every((game) => game.source === "rawg")).toBe(true);
  });

  it("ranks shared genres above popularity and rating", () => {
    const sharedOneGenre = rawgGame({
      id: 1,
      name: "Action Only",
      genres: [action],
      rating: 4.9,
      added: 50000,
    });
    const sharedTwoGenres = rawgGame({
      id: 2,
      name: "Action Adventure",
      genres: [action, adventure],
      rating: 2,
      added: 10,
    });

    const result = rankSimilarGames(gta, [sharedOneGenre, sharedTwoGenres]);

    expect(result.map((game) => game.id)).toEqual(["2", "1"]);
  });

  it("uses platform overlap and then rating as tie-breakers", () => {
    const bothPlatforms = rawgGame({
      id: 10,
      name: "PC And Xbox",
      genres: [action],
      platforms: [pc, xboxOne],
      rating: 3,
    });
    const onePlatform = rawgGame({
      id: 11,
      name: "PC Only",
      genres: [action],
      platforms: [pc],
      rating: 4.8,
    });
    const higherRatedTwin = rawgGame({
      id: 12,
      name: "PC Xbox Rated",
      genres: [action],
      platforms: [pc, xboxOne],
      rating: 4.6,
    });

    const result = rankSimilarGames(gta, [onePlatform, bothPlatforms, higherRatedTwin]);

    expect(result.map((game) => game.id)).toEqual(["12", "10", "11"]);
  });

  it("does not treat a generic tag as a recommendation signal", () => {
    const crimeOnly = rawgGame({ id: 20, name: "Crime Story", tags: [crime], platforms: [ps4] });

    expect(rankSimilarGames(gta, [crimeOnly])).toEqual([]);
  });

  it("recommends racing titles for a racing seed and drops unrelated sports titles", () => {
    const forza5 = rawgGame({
      id: 300,
      name: "Forza Horizon 5",
      genres: [racing],
      tags: [openWorld],
      platforms: [xboxOne, pc],
      developers: [playground],
      rating: 4.5,
    });
    const forza4 = rawgGame({
      id: 301,
      name: "Forza Horizon 4",
      genres: [racing],
      tags: [openWorld],
      platforms: [xboxOne, pc],
      developers: [playground],
      rating: 4.3,
    });
    const needForSpeed = rawgGame({
      id: 302,
      name: "Need for Speed Heat",
      genres: [racing],
      platforms: [ps4, pc],
      rating: 3.9,
    });
    const marioKart = rawgGame({
      id: 303,
      name: "Mario Kart 8 Deluxe",
      genres: [racing],
      platforms: [switchConsole],
      rating: 4.4,
    });

    const result = rankSimilarGames(forza5, [fifa, marioKart, needForSpeed, forza4]);

    expect(result.map((game) => game.id)).toEqual(["301", "302", "303"]);
  });

  it("falls back to platform overlap only when the seed has no genre signal", () => {
    const bareSeed = rawgGame({ id: 500, name: "Bare Game", genres: [], platforms: [ps4] });
    const samePlatform = rawgGame({
      id: 501,
      name: "Same Platform",
      genres: [action],
      platforms: [ps4],
    });
    const otherPlatform = rawgGame({
      id: 502,
      name: "Other Platform",
      genres: [action],
      platforms: [pc],
    });

    expect(rankSimilarGames(bareSeed, [samePlatform, otherPlatform]).map((game) => game.id)).toEqual(
      ["501"],
    );
  });

  it("still rejects platform-only matches when the seed has genres", () => {
    expect(rankSimilarGames(gta, [fifa])).toEqual([]);
  });

  it("caps the result list at the requested limit", () => {
    const candidates = Array.from({ length: 9 }).map((_, index) =>
      rawgGame({ id: 700 + index, name: `Action Game ${index}`, genres: [action] }),
    );

    expect(rankSimilarGames(gta, candidates)).toHaveLength(6);
    expect(rankSimilarGames(gta, candidates, 3)).toHaveLength(3);
  });

  it("maps ranked candidates with cover fallbacks instead of inventing data", () => {
    const [entry] = rankSimilarGames(gta, [redDead2]);

    expect(entry).toEqual(mapRawgGame(redDead2));
  });
});

describe("similar candidate queries", () => {
  it("filters by the seed's real RAWG genre IDs", () => {
    const queries = buildCandidateQueries(gta);

    expect(queries).toEqual([
      { genres: "4,3", ordering: "-rating", page_size: 40 },
      { genres: "4,3", ordering: "-added", page_size: 40 },
    ]);
  });

  it("falls back to the seed's real platform IDs when no genres exist", () => {
    const noGenres = rawgGame({
      id: 600,
      name: "Platform Only",
      genres: [],
      platforms: [ps4, xboxOne, pc],
    });

    expect(buildCandidateQueries(noGenres)).toEqual([
      { platforms: "18,1,4", ordering: "-rating", page_size: 40 },
    ]);
  });

  it("does not call RAWG without any filterable traits", () => {
    expect(buildCandidateQueries(rawgGame({ id: 601, name: "Empty", genres: [] }))).toEqual([]);
  });
});

describe("fetching recommendations from RAWG", () => {
  const rawgFetchMock = vi.mocked(rawgFetch);
  const listResponse = (results: RawgGame[]): RawgListResponse => ({
    count: results.length,
    next: null,
    previous: null,
    results,
  });

  beforeEach(() => {
    rawgFetchMock.mockReset();
  });

  it("merges both candidate pages and ranks the pool once", async () => {
    rawgFetchMock
      .mockResolvedValueOnce(listResponse([watchDogs]))
      .mockResolvedValueOnce(listResponse([redDead2, watchDogs]));

    const result = await fetchSimilarGamesFromRawg(gta);

    expect(result.map((game) => game.id)).toEqual(["28", "5070"]);
    expect(rawgFetchMock).toHaveBeenCalledTimes(2);
    expect(rawgFetchMock.mock.calls[0]?.[1]).toMatchObject({
      genres: "4,3",
      ordering: "-rating",
      page_size: 40,
    });
    expect(rawgFetchMock.mock.calls[1]?.[1]).toMatchObject({
      genres: "4,3",
      ordering: "-added",
    });
  });

  it("still recommends from the page that answered when the other fails", async () => {
    rawgFetchMock
      .mockRejectedValueOnce(new RawgError("RAWG responded with 403", 403))
      .mockResolvedValueOnce(listResponse([redDead2]));

    await expect(fetchSimilarGamesFromRawg(gta)).resolves.toEqual([mapRawgGame(redDead2)]);
  });

  it("surfaces the upstream failure when every page fails", async () => {
    rawgFetchMock.mockRejectedValue(new RawgError("RAWG responded with 403", 403));

    await expect(fetchSimilarGamesFromRawg(gta)).rejects.toBeInstanceOf(RawgError);
  });

  it("skips RAWG entirely when the seed cannot be filtered", async () => {
    const seed = rawgGame({ id: 602, name: "Traitless", genres: [] });

    await expect(fetchSimilarGamesFromRawg(seed)).resolves.toEqual([]);
    expect(rawgFetchMock).not.toHaveBeenCalled();
  });
});
