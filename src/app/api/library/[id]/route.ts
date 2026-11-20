import type { NextRequest } from "next/server";

import { libraryEntryIdSchema, updateLibraryEntrySchema } from "@/lib/library-schema";
import { hasValidOrigin } from "@/server/auth/user";
import { jsonError, jsonOk } from "@/server/http";
import { libraryFailure } from "@/server/library/http";
import {
  removeLibraryEntryForUser,
  updateLibraryEntryForUser,
} from "@/server/library/service";
import { requireLibrarySession } from "@/server/library/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function invalidEntryId() {
  return jsonError("Invalid library entry id.", 400, { code: "INVALID_ENTRY_ID" });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const { id } = await params;
  const entryId = libraryEntryIdSchema.safeParse(id);
  if (!entryId.success) return invalidEntryId();

  const body = await request.json().catch(() => null);
  const parsed = updateLibraryEntrySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid library update.", 400, {
      code: "INVALID_BODY",
      details: parsed.error.issues,
    });
  }

  const session = await requireLibrarySession(request);
  if (!session.ok) return session.response;

  try {
    const entry = await updateLibraryEntryForUser(session.user.id, entryId.data, parsed.data);
    return jsonOk(entry, { headers: NO_STORE });
  } catch (error) {
    return libraryFailure(error, "update");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const { id } = await params;
  const entryId = libraryEntryIdSchema.safeParse(id);
  if (!entryId.success) return invalidEntryId();

  const session = await requireLibrarySession(request);
  if (!session.ok) return session.response;

  try {
    await removeLibraryEntryForUser(session.user.id, entryId.data);
    return jsonOk({ removed: true }, { headers: NO_STORE });
  } catch (error) {
    return libraryFailure(error, "remove");
  }
}
