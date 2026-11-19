import { requireAdmin } from "@/server/auth/admin";
import { getAdminUserMessage } from "@/server/admin/users";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const message = await getAdminUserMessage(id, messageId);
  if (!message) return jsonError("Message not found for this user.", 404, { code: "MESSAGE_NOT_FOUND" });
  return jsonOk(message);
}
