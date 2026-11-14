import { NextResponse } from "next/server";

import { customGameUpdateSchema } from "@/lib/custom-game-schema";
import { requireAdmin } from "@/server/auth/admin";
import {
  deleteCustomGame,
  getCustomGameForAdmin,
  updateCustomGame,
} from "@/server/custom-games/service";
import {
  CustomGameStoreUnavailableError,
  DuplicateCustomGameError,
  describeStoreError,
} from "@/server/custom-games/types";
import { jsonError } from "@/server/http";

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;

function storeError(error: unknown) {
  if (error instanceof CustomGameStoreUnavailableError) {
    return jsonError(error.message, 503, { code: "CUSTOM_STORE_UNAVAILABLE" });
  }
  console.error("[custom-games] admin request failed:", describeStoreError(error));
  return jsonError("The custom games store is temporarily unavailable.", 500, {
    code: "CUSTOM_STORE_ERROR",
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID_PATTERN.test(id)) return jsonError("Invalid game id.", 400, { code: "INVALID_GAME_ID" });

  try {
    const game = await getCustomGameForAdmin(id);
    if (!game) return jsonError("Custom game not found.", 404, { code: "CUSTOM_GAME_NOT_FOUND" });
    return NextResponse.json({ data: game });
  } catch (error) {
    return storeError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID_PATTERN.test(id)) return jsonError("Invalid game id.", 400, { code: "INVALID_GAME_ID" });

  const body = await request.json().catch(() => null);
  const parsed = customGameUpdateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return jsonError("Nothing to update.", 400, {
      code: "VALIDATION_ERROR",
      details: parsed.success ? undefined : parsed.error.issues,
    });
  }

  try {
    const game = await updateCustomGame(id, parsed.data);
    if (!game) return jsonError("Custom game not found.", 404, { code: "CUSTOM_GAME_NOT_FOUND" });
    return NextResponse.json({ data: game });
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!ID_PATTERN.test(id)) return jsonError("Invalid game id.", 400, { code: "INVALID_GAME_ID" });

  try {
    const removed = await deleteCustomGame(id);
    if (!removed) return jsonError("Custom game not found.", 404, { code: "CUSTOM_GAME_NOT_FOUND" });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return storeError(error);
  }
}
