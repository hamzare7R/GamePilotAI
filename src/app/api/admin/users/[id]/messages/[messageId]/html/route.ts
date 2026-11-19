import { requireAdmin } from "@/server/auth/admin";
import { fetchAdminUserMessageHtml } from "@/server/admin/users";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Explicit owner action: fetches the original HTML part live from Gmail. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id, messageId } = await params;
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(messageId)) {
    return jsonError("Invalid identifier.", 400, { code: "INVALID_ID" });
  }

  const result = await fetchAdminUserMessageHtml(id, messageId);
  if (!result.ok) {
    const status = result.code === "MESSAGE_NOT_FOUND" ? 404 : 502;
    return jsonError(result.message, status, { code: result.code ?? undefined, details: result });
  }
  return jsonOk(result);
}
