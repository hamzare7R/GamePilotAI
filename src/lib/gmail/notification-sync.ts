import {
  claimPubSubMessage,
  getConnectionByEmail,
  insertNotification,
  recordSyncEvent,
  reclassifyStoredNotifications,
  setConnectionStatus,
  updateConnectionSync,
  updateConnectionWatch,
} from "@/server/mail/repository";
import type { ConnectionStatus, MailConnection } from "@/server/mail/types";

import type { PubSubNotification } from "./pubsub-verification";
import {
  fetchMailboxHistoryId,
  getMessageContent,
  HistoryExpiredError,
  listInboxHistory,
  listRecentInboxMessageIds,
  startInboxWatch,
} from "./gmail-client";
import { parseHeaderDate, parseSenderAddress } from "./message-metadata";
import { refreshAccessToken } from "./oauth";
import { identifyService } from "./service-identifier";
import { decryptToken } from "./token-encryption";

const MAX_MESSAGES_PER_SYNC = 40;

export type SyncResult = {
  status: "ok" | "failed" | "skipped" | "duplicate";
  processed: number;
  skipped: number;
  errorCode?: string;
};

const AUTH_ERROR_CODES = new Set(["TOKEN_REFRESH_FAILED", "TOKEN_EXCHANGE_FAILED"]);

function safeErrorCode(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code) ? code : "SYNC_FAILED";
}

async function accessTokenFor(connection: MailConnection) {
  const refreshToken = decryptToken(connection.encryptedRefreshToken);
  const token = await refreshAccessToken(refreshToken);
  return token.access_token!;
}

async function resolveMessageIds(accessToken: string, connection: MailConnection, fullResync: boolean) {
  if (!fullResync && connection.historyId) {
    try {
      const history = await listInboxHistory(accessToken, connection.historyId);
      return { messageIds: history.messageIds, historyId: history.historyId };
    } catch (error) {
      if (!(error instanceof HistoryExpiredError)) throw error;
    }
  }

  // Full resync: newest page only, then adopt the mailbox historyId so the next
  // run can use incremental history again.
  const [messageIds, profile] = await Promise.all([
    listRecentInboxMessageIds(accessToken),
    fetchMailboxHistoryId(accessToken).catch(() => null),
  ]);
  return { messageIds, historyId: profile?.historyId ?? null };
}

export async function syncConnection(
  connection: MailConnection,
  options: { fullResync?: boolean } = {},
): Promise<SyncResult> {
  try {
    const accessToken = await accessTokenFor(connection);
    const { messageIds, historyId } = await resolveMessageIds(
      accessToken,
      connection,
      options.fullResync ?? false,
    );

    let processed = 0;
    let skipped = 0;

    for (const messageId of messageIds.slice(0, MAX_MESSAGES_PER_SYNC)) {
      let content: Awaited<ReturnType<typeof getMessageContent>>;
      try {
        content = await getMessageContent(accessToken, messageId);
      } catch {
        skipped += 1;
        continue;
      }

      const sender = parseSenderAddress(content.headers.from);
      if (!sender) {
        skipped += 1;
        continue;
      }

      const match = identifyService(sender.senderAddress, sender.senderDomain);
      const inserted = await insertNotification({
        userId: connection.userId,
        connectionId: connection.id,
        gmailMessageId: content.id,
        senderDomain: sender.senderDomain,
        senderAddress: sender.senderAddress,
        serviceName: match.service,
        messageCategory: match.category,
        receivedAt: parseHeaderDate(content.headers.date),
        subject: content.headers.subject ?? "",
        recipient: content.headers.to ?? "",
        bodyText: content.bodyText,
        snippet: content.snippet,
        headers: content.headers,
        attachments: content.attachments,
      });

      if (inserted) processed += 1;
      else skipped += 1;
    }

    await reclassifyStoredNotifications(connection.userId);

    await updateConnectionSync(connection.id, historyId);
    await recordSyncEvent({ connectionId: connection.id, eventType: "sync", status: "success" });

    return { status: "ok", processed, skipped };
  } catch (error) {
    const code = safeErrorCode(error);
    const status: ConnectionStatus = AUTH_ERROR_CODES.has(code) ? "error" : "active";
    await setConnectionStatus(connection.id, status).catch(() => undefined);
    await recordSyncEvent({
      connectionId: connection.id,
      eventType: "sync",
      status: "failed",
      errorCode: code,
    }).catch(() => undefined);

    return { status: "failed", processed: 0, skipped: 0, errorCode: code };
  }
}

export async function processPubSubNotification(notification: PubSubNotification): Promise<SyncResult> {
  // The address from Pub/Sub is only used to find a stored connection; the
  // user identity always comes from our own database row.
  const connection = await getConnectionByEmail(notification.emailAddress);

  const claim = await claimPubSubMessage(connection?.id ?? null, notification.messageId);
  if (!claim) return { status: "duplicate", processed: 0, skipped: 0 };

  if (!connection || connection.status === "revoked") {
    return { status: "skipped", processed: 0, skipped: 0 };
  }

  return syncConnection(connection);
}

export async function renewConnectionWatch(connection: MailConnection, topicName: string) {
  try {
    const accessToken = await accessTokenFor(connection);
    const watch = await startInboxWatch(accessToken, topicName);
    const expiration = new Date(Number(watch.expiration));
    await updateConnectionWatch({
      connectionId: connection.id,
      historyId: watch.historyId || connection.historyId,
      watchExpiration: Number.isNaN(expiration.getTime()) ? null : expiration,
      status: "active",
    });
    await recordSyncEvent({ connectionId: connection.id, eventType: "watch_renewed", status: "success" });
    return { ok: true as const };
  } catch (error) {
    const code = safeErrorCode(error);
    await setConnectionStatus(connection.id, "error").catch(() => undefined);
    await recordSyncEvent({
      connectionId: connection.id,
      eventType: "watch_renewed",
      status: "failed",
      errorCode: code,
    }).catch(() => undefined);
    return { ok: false as const, errorCode: code };
  }
}
