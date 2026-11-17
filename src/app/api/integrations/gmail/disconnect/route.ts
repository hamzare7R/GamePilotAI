import { GmailApiError, revokeGoogleToken } from "@/lib/gmail/oauth";
import { decryptToken } from "@/lib/gmail/token-encryption";
import { getSessionUser, hasValidOrigin } from "@/server/auth/user";
import { jsonError, jsonOk } from "@/server/http";
import { gmailFailure } from "@/server/mail/http";
import { removeConnectionForUser } from "@/server/mail/repository";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to disconnect Gmail.", 401, { code: "UNAUTHORIZED" });

  try {
    const removed = await removeConnectionForUser(user.id);
    if (!removed) {
      return jsonOk({ disconnected: false, revoked: false });
    }

    // Stored Mail Monitor data is retained. Only the OAuth credential is revoked
    // and cleared; a Google outage cannot trap the user in a connected state.
    let revoked = false;
    try {
      await revokeGoogleToken(decryptToken(removed.encryptedRefreshToken));
      revoked = true;
    } catch (error) {
      const code = error instanceof GmailApiError ? error.code : "REVOKE_SKIPPED";
      console.warn("[gmail:disconnect] token revocation skipped:", code);
    }

    return jsonOk({ disconnected: true, revoked });
  } catch (error) {
    return gmailFailure(error, "disconnect");
  }
}
