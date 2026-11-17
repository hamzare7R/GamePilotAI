import { NextResponse } from "next/server";

import { getMessageContent } from "@/lib/gmail/gmail-client";
import { refreshAccessToken } from "@/lib/gmail/oauth";
import { decryptToken } from "@/lib/gmail/token-encryption";
import { getSessionUser } from "@/server/auth/user";
import { getConnectionForUser, getNotificationForUser } from "@/server/mail/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to view this email.", 401);

  const { notificationId } = await params;
  const notification = await getNotificationForUser(user.id, notificationId);
  if (!notification) return jsonError("Notification not found.", 404);

  const connection = await getConnectionForUser(user.id);
  if (!connection || connection.status !== "active") {
    return jsonError("Reconnect your Gmail account to view this email.", 409);
  }

  try {
    const refreshToken = decryptToken(connection.encryptedRefreshToken);
    const tokens = await refreshAccessToken(refreshToken);
    const message = await getMessageContent(tokens.access_token!, notification.gmailMessageId);

    return NextResponse.json(
      {
        subject: message.headers.subject ?? "(No subject)",
        from: message.headers.from ?? notification.senderAddress,
        to: message.headers.to ?? "",
        date: message.headers.date ?? "",
        bodyText: message.bodyText,
        snippet: message.snippet,
        attachments: message.attachments,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const failure = error as { status?: unknown; code?: unknown; reason?: unknown };
    const status = failure.status;
    const code = typeof failure.code === "string" ? failure.code : "UNKNOWN";
    const reason = typeof failure.reason === "string" ? failure.reason : "UNKNOWN";

    // Log only machine-readable diagnostics; never log tokens, addresses, or message content.
    console.error("[gmail:message] fetch failed:", { code, status, reason });

    if (status === 404) return jsonError("This email is no longer available in Gmail.", 404);
    if (reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || reason === "insufficientPermissions") {
      return jsonError(
        "This Gmail connection has not granted message-reading access yet. Select Reconnect Gmail and approve the new Gmail permission.",
        409,
      );
    }
    if (reason === "SERVICE_DISABLED" || reason === "accessNotConfigured") {
      return jsonError("The Gmail API is not enabled for this Google Cloud project. The app owner must enable Gmail API.", 503);
    }
    if (reason === "domainPolicy") {
      return jsonError("Your Google Workspace administrator blocks this Gmail integration.", 403);
    }
    if (status === 401 || code === "TOKEN_REFRESH_FAILED") {
      return jsonError("Your Gmail authorization has expired or was revoked. Reconnect your Gmail account.", 409);
    }
    if (status === 403) {
      return jsonError("Google refused this Gmail request. The app owner needs to check Gmail API permissions and quota.", 502);
    }
    return jsonError("Unable to load this email right now. Please try again.", 502);
  }
}
