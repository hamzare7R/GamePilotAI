import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/user";
import { getNotificationForUser } from "@/server/mail/repository";

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

  return NextResponse.json(
    {
      subject: notification.subject || "(No subject)",
      from: notification.headers.from ?? notification.senderAddress,
      to: notification.recipient,
      date: notification.headers.date ?? "",
      bodyText: notification.bodyText,
      snippet: notification.snippet,
      attachments: notification.attachments,
      contentFetchedAt: notification.contentFetchedAt,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
