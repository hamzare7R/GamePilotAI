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
    const status = (error as { status?: unknown }).status;
    if (status === 404) return jsonError("This email is no longer available in Gmail.", 404);
    if (status === 401 || status === 403) {
      return jsonError("Gmail access needs to be renewed. Reconnect your Gmail account.", 409);
    }
    console.error(
      "[gmail:message] fetch failed:",
      (error as { code?: unknown }).code ?? (error instanceof Error ? error.name : "unknown"),
    );
    return jsonError("Unable to load this email right now. Please try again.", 502);
  }
}
