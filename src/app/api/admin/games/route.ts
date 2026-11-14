import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/admin";
import { createCustomGame, listCustomGamesForAdmin } from "@/server/custom-games/service";
import {
  CustomGameStoreUnavailableError,
  DuplicateCustomGameError,
  describeStoreError,
} from "@/server/custom-games/types";
import { customGameInputSchema } from "@/lib/custom-game-schema";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const statusFilterSchema = z.enum(["published", "draft", "archived", "all"]).default("all");

function storeError(error: unknown) {
  if (error instanceof CustomGameStoreUnavailableError) {
    return jsonError(error.message, 503, { code: "CUSTOM_STORE_UNAVAILABLE" });
  }
  console.error("[custom-games] admin request failed:", describeStoreError(error));
  return jsonError("The custom games store is temporarily unavailable.", 500, {
    code: "CUSTOM_STORE_ERROR",
  });
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const status = statusFilterSchema.safeParse(url.searchParams.get("status") ?? "all");
  if (!status.success) {
    return jsonError("Unknown status filter.", 400, { code: "INVALID_QUERY" });
  }

  try {
    const games = await listCustomGamesForAdmin({
      search: url.searchParams.get("search") ?? undefined,
      status: status.data,
    });
    return NextResponse.json({ data: games });
  } catch (error) {
    return storeError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = customGameInputSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Check the highlighted fields and try again.", 400, {
      code: "VALIDATION_ERROR",
      details: parsed.error.issues,
    });
  }

  try {
    const game = await createCustomGame(parsed.data);
    return NextResponse.json({ data: game }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateCustomGameError) {
      return jsonError(error.message, 409, {
        code: "DUPLICATE_GAME",
        details: { field: error.field, source: error.source },
      });
    }
    return storeError(error);
  }
}
