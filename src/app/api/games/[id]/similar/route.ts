import { CatalogNotFoundError } from "@/server/catalog/errors";
import { getSimilarGames } from "@/server/catalog/service";
import { jsonError, jsonOk } from "@/server/http";

export const dynamic = "force-dynamic";

const GAME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!GAME_ID_PATTERN.test(id)) {
    return jsonError("Invalid game id.", 400, { code: "INVALID_GAME_ID" });
  }

  try {
    const games = await getSimilarGames(id);

    return jsonOk(games, {
      // Custom entries can change at any time; RAWG pages stay cached upstream.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof CatalogNotFoundError) {
      return jsonError("That game is not in the catalog.", 404, { code: "GAME_NOT_FOUND" });
    }

    return jsonError("Similar games are temporarily unavailable. Please retry shortly.", 502, {
      code: "CATALOG_UNAVAILABLE",
    });
  }
}
