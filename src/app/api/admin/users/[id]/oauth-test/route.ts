import { requireAdmin } from "@/server/auth/admin";
import { testAdminUserGmail, type AdminUserOAuthTestMode } from "@/server/admin/users";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODES: AdminUserOAuthTestMode[] = ["connection", "refresh"];

/**
 * Manual owner-triggered OAuth check. Never runs on page load and never changes
 * the connection state: it only refreshes an access token in memory.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return jsonError("Invalid identifier.", 400, { code: "INVALID_ID" });
  }

  const body = (await request.json().catch(() => null)) as { mode?: unknown } | null;
  const mode = body?.mode;
  if (typeof mode !== "string" || !MODES.includes(mode as AdminUserOAuthTestMode)) {
    return jsonError("Choose a valid test mode.", 400, { code: "INVALID_MODE" });
  }

  const result = await testAdminUserGmail(id, mode as AdminUserOAuthTestMode);
  return jsonOk(result);
}
