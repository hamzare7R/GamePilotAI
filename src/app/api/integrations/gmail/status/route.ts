import { isGmailConfigured } from "@/lib/gmail/env";
import { getSessionUser } from "@/server/auth/user";
import { jsonError, jsonOk } from "@/server/http";
import { gmailFailure } from "@/server/mail/http";
import { getConnectionForUser, listSyncEvents } from "@/server/mail/repository";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to view your Gmail connection.", 401, { code: "UNAUTHORIZED" });

  if (!isGmailConfigured()) {
    return jsonOk({ configured: false, connection: null, events: [] });
  }

  try {
    const connection = await getConnectionForUser(user.id);
    const events = connection ? await listSyncEvents(connection.id) : [];

    return jsonOk({
      configured: true,
      connection: connection
        ? {
            emailAddress: connection.emailAddress,
            status: connection.status,
            watchExpiration: connection.watchExpiration?.toISOString() ?? null,
            lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
            createdAt: connection.createdAt.toISOString(),
          }
        : null,
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        status: event.status,
        errorCode: event.errorCode,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return gmailFailure(error, "status");
  }
}
