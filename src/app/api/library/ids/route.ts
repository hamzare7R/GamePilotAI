import type { NextRequest } from "next/server";

import { jsonOk } from "@/server/http";
import { libraryFailure } from "@/server/library/http";
import { listLibraryMembershipForUser } from "@/server/library/service";
import { requireLibrarySession } from "@/server/library/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireLibrarySession(request);
  if (!session.ok) return session.response;

  try {
    const membership = await listLibraryMembershipForUser(session.user.id);
    return jsonOk(membership, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return libraryFailure(error, "membership");
  }
}
