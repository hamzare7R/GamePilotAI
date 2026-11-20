import type { NextRequest } from "next/server";

import { addLibraryEntrySchema, libraryListQuerySchema } from "@/lib/library-schema";
import { hasValidOrigin } from "@/server/auth/user";
import { jsonError, jsonOk } from "@/server/http";
import { libraryFailure } from "@/server/library/http";
import {
  addLibraryEntryForUser,
  listLibraryForUser,
} from "@/server/library/service";
import { requireLibrarySession } from "@/server/library/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const parsed = libraryListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return jsonError("Invalid library query.", 400, {
      code: "INVALID_QUERY",
      details: parsed.error.issues,
    });
  }

  const session = await requireLibrarySession(request);
  if (!session.ok) return session.response;

  try {
    const result = await listLibraryForUser(session.user.id, {
      status: parsed.data.status,
      search: parsed.data.search,
      platform: parsed.data.platform,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return jsonOk(result, { headers: NO_STORE });
  } catch (error) {
    return libraryFailure(error, "list");
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const body = await request.json().catch(() => null);
  const parsed = addLibraryEntrySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid library entry.", 400, {
      code: "INVALID_BODY",
      details: parsed.error.issues,
    });
  }

  const session = await requireLibrarySession(request);
  if (!session.ok) return session.response;

  try {
    const { entry, created } = await addLibraryEntryForUser(session.user.id, parsed.data);

    return jsonOk(entry, { status: created ? 201 : 200, headers: NO_STORE });
  } catch (error) {
    return libraryFailure(error, "add");
  }
}
