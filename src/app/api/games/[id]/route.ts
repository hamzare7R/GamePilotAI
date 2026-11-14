import { CatalogNotFoundError } from "@/server/catalog/errors";
import { getGameDetail } from "@/server/catalog/service";
import { jsonError, jsonOk } from "@/server/http";

export const revalidate = 3600;

const GAME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!GAME_ID_PATTERN.test(id)) {
    return jsonError("Invalid game id.", 400, { code: "INVALID_GAME_ID" });
  }

  try {
    const result = await getGameDetail(id);

    return jsonOk(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    if (error instanceof CatalogNotFoundError) {
      return jsonError("That game is not in the catalog.", 404, { code: "GAME_NOT_FOUND" });
    }

    return jsonError("Game details are temporarily unavailable. Please retry shortly.", 502, {
      code: "CATALOG_UNAVAILABLE",
    });
  }
}
