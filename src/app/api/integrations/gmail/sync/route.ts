import { syncConnection } from "@/lib/gmail/notification-sync";
import { getSessionUser, hasValidOrigin } from "@/server/auth/user";
import { jsonError, jsonOk } from "@/server/http";
import { gmailFailure } from "@/server/mail/http";
import { getConnectionForUser, hasStoredMessageContent } from "@/server/mail/repository";

const WINDOW_MS = 5 * 1000;
const lastSync = new Map<string, number>();

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to sync Gmail.", 401, { code: "UNAUTHORIZED" });

  const last = lastSync.get(user.id) ?? 0;
  if (Date.now() - last < WINDOW_MS) {
    return jsonError("A sync just ran. Try again in a few seconds.", 429, { code: "RATE_LIMITED" });
  }
  lastSync.set(user.id, Date.now());

  try {
    const connection = await getConnectionForUser(user.id);
    if (!connection) {
      return jsonError("Connect Gmail before syncing.", 400, { code: "NOT_CONNECTED" });
    }

    const fullResync = !(await hasStoredMessageContent(user.id));
    const result = await syncConnection(connection, { fullResync });
    return jsonOk(result);
  } catch (error) {
    return gmailFailure(error, "sync");
  }
}
