import { randomUUID } from "node:crypto";

import { getPool } from "@/server/db/pool";
import { identifyService } from "@/lib/gmail/service-identifier";

import { ensureMailSchema } from "./schema";
import type {
  AdminMailSummary,
  ConnectedServiceSummary,
  ConnectionStatus,
  MailConnection,
  MailNotification,
  MailSummary,
  SyncEvent,
} from "./types";

export class GmailAlreadyLinkedError extends Error {
  readonly code = "GMAIL_ALREADY_LINKED";

  constructor() {
    super("This Gmail address is already linked to another GamePilot account.");
    this.name = "GmailAlreadyLinkedError";
  }
}

type ConnectionRow = {
  id: string;
  user_id: string;
  email_address: string;
  encrypted_refresh_token: string;
  connection_status: ConnectionStatus;
  history_id: string | null;
  watch_expiration: Date | null;
  last_sync_at: Date | null;
  created_at: Date;
};

const CONNECTION_COLUMNS = `id, user_id, email_address, encrypted_refresh_token, connection_status,
  history_id, watch_expiration, last_sync_at, created_at`;

function toConnection(row: ConnectionRow): MailConnection {
  return {
    id: row.id,
    userId: row.user_id,
    emailAddress: row.email_address,
    encryptedRefreshToken: row.encrypted_refresh_token,
    status: row.connection_status,
    historyId: row.history_id,
    watchExpiration: row.watch_expiration,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
  };
}

export async function getConnectionForUser(userId: string) {
  await ensureMailSchema();
  const result = await getPool().query<ConnectionRow>(
    `SELECT ${CONNECTION_COLUMNS} FROM gmail_connections WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0] ? toConnection(result.rows[0]) : null;
}

export async function getConnectionByEmail(emailAddress: string) {
  await ensureMailSchema();
  const result = await getPool().query<ConnectionRow>(
    `SELECT ${CONNECTION_COLUMNS} FROM gmail_connections WHERE email_address = $1 LIMIT 1`,
    [emailAddress.trim().toLowerCase()],
  );
  return result.rows[0] ? toConnection(result.rows[0]) : null;
}

export async function saveConnection(input: {
  userId: string;
  emailAddress: string;
  encryptedRefreshToken: string;
  historyId: string | null;
  watchExpiration: Date | null;
  status: ConnectionStatus;
}) {
  await ensureMailSchema();
  try {
    const result = await getPool().query<ConnectionRow>(
      `INSERT INTO gmail_connections
         (id, user_id, email_address, encrypted_refresh_token, connection_status, history_id, watch_expiration, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (user_id) DO UPDATE SET
         email_address = EXCLUDED.email_address,
         encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
         connection_status = EXCLUDED.connection_status,
         history_id = EXCLUDED.history_id,
         watch_expiration = EXCLUDED.watch_expiration,
         updated_at = now()
       RETURNING ${CONNECTION_COLUMNS}`,
      [
        randomUUID(),
        input.userId,
        input.emailAddress,
        input.encryptedRefreshToken,
        input.status,
        input.historyId,
        input.watchExpiration,
      ],
    );
    return toConnection(result.rows[0]!);
  } catch (error) {
    if ((error as { code?: unknown }).code === "23505") throw new GmailAlreadyLinkedError();
    throw error;
  }
}

export async function updateConnectionWatch(input: {
  connectionId: string;
  historyId: string | null;
  watchExpiration: Date | null;
  status: ConnectionStatus;
}) {
  await ensureMailSchema();
  await getPool().query(
    `UPDATE gmail_connections
        SET history_id = $2, watch_expiration = $3, connection_status = $4, updated_at = now()
      WHERE id = $1`,
    [input.connectionId, input.historyId, input.watchExpiration, input.status],
  );
}

export async function updateConnectionSync(connectionId: string, historyId: string | null) {
  await ensureMailSchema();
  await getPool().query(
    `UPDATE gmail_connections
        SET history_id = COALESCE($2, history_id), last_sync_at = now(), connection_status = 'active', updated_at = now()
      WHERE id = $1`,
    [connectionId, historyId],
  );
}

export async function setConnectionStatus(connectionId: string, status: ConnectionStatus) {
  await ensureMailSchema();
  await getPool().query(`UPDATE gmail_connections SET connection_status = $2, updated_at = now() WHERE id = $1`, [
    connectionId,
    status,
  ]);
}

export async function removeConnectionForUser(userId: string) {
  await ensureMailSchema();
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    // Preserve all previously imported mail and attachments. Disconnect only
    // revokes access and clears the stored OAuth credential.
    const connection = await client.query<{ id: string; email_address: string; encrypted_refresh_token: string }>(
      `SELECT id, email_address, encrypted_refresh_token
         FROM gmail_connections
        WHERE user_id = $1
        LIMIT 1
        FOR UPDATE`,
      [userId],
    );
    const row = connection.rows[0];
    if (!row) {
      await client.query("COMMIT");
      return null;
    }

    await client.query(
      `UPDATE gmail_connections
          SET connection_status = 'revoked',
              encrypted_refresh_token = '',
              history_id = NULL,
              watch_expiration = NULL,
              updated_at = now()
        WHERE id = $1`,
      [row.id],
    );

    await client.query("COMMIT");
    return { emailAddress: row.email_address, encryptedRefreshToken: row.encrypted_refresh_token };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Writes a sync event. When `pubsubMessageId` is provided the unique index makes
 * this idempotent: a duplicate Pub/Sub delivery returns false and is not
 * processed twice.
 */
export async function recordSyncEvent(input: {
  connectionId: string | null;
  eventType: string;
  status: "success" | "failed" | "skipped";
  errorCode?: string | null;
  pubsubMessageId?: string | null;
}) {
  await ensureMailSchema();
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO gmail_sync_events (id, connection_id, event_type, status, error_code, pubsub_message_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (pubsub_message_id) WHERE pubsub_message_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [
      randomUUID(),
      input.connectionId,
      input.eventType,
      input.status,
      input.errorCode ?? null,
      input.pubsubMessageId ?? null,
    ],
  );
  return result.rowCount === 1;
}

/**
 * Claims a Pub/Sub message id exactly once. Pub/Sub can deliver the same event
 * more than once, so a null return means "already handled, skip".
 */
export async function claimPubSubMessage(connectionId: string | null, messageId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO gmail_sync_events (id, connection_id, event_type, status, pubsub_message_id)
     VALUES ($1, $2, 'pubsub', 'received', $3)
     ON CONFLICT (pubsub_message_id) WHERE pubsub_message_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [randomUUID(), connectionId, messageId],
  );
  return result.rows[0]?.id ?? null;
}

export async function hasStoredMessageContent(userId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{ found: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM gmail_notifications
        WHERE user_id = $1 AND content_fetched_at IS NOT NULL
     ) AS found`,
    [userId],
  );
  return result.rows[0]?.found ?? false;
}

export async function enqueueSyncMessages(
  input: { userId: string; connectionId: string; messageIds: string[]; historyId: string | null },
) {
  await ensureMailSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const messageId of input.messageIds) {
      await client.query(
        `INSERT INTO gmail_sync_queue (id, user_id, connection_id, gmail_message_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (connection_id, gmail_message_id) DO NOTHING`,
        [randomUUID(), input.userId, input.connectionId, messageId],
      );
    }
    // Advancing history is safe because every discovered message is now durable in the queue.
    await client.query(
      `UPDATE gmail_connections
          SET history_id = COALESCE($2, history_id), updated_at = now()
        WHERE id = $1 AND user_id = $3`,
      [input.connectionId, input.historyId, input.userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listPendingSyncMessages(connectionId: string, limit = 40) {
  await ensureMailSchema();
  const result = await getPool().query<{ gmail_message_id: string }>(
    `SELECT gmail_message_id
       FROM gmail_sync_queue
      WHERE connection_id = $1
      ORDER BY created_at ASC
      LIMIT $2`,
    [connectionId, Math.min(Math.max(limit, 1), 100)],
  );
  return result.rows.map((row) => row.gmail_message_id);
}

export async function removePendingSyncMessage(connectionId: string, gmailMessageId: string) {
  await ensureMailSchema();
  await getPool().query(
    "DELETE FROM gmail_sync_queue WHERE connection_id = $1 AND gmail_message_id = $2",
    [connectionId, gmailMessageId],
  );
}

export async function completeSyncQueue(connectionId: string, historyId: string | null) {
  await ensureMailSchema();
  const result = await getPool().query<{ pending: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM gmail_sync_queue WHERE connection_id = $1) AS pending",
    [connectionId],
  );
  const pending = result.rows[0]?.pending ?? false;
  if (!pending) {
    await updateConnectionSync(connectionId, historyId);
  }
  return { complete: !pending };
}

export async function insertNotification(input: {
  userId: string;
  connectionId: string;
  gmailMessageId: string;
  senderDomain: string;
  senderAddress: string;
  serviceName: string;
  messageCategory: string;
  receivedAt: Date | null;
  subject: string;
  recipient: string;
  bodyText: string;
  snippet: string;
  headers: Record<string, string>;
  attachments: Array<{ filename: string; mimeType: string; data: Buffer }>;
}) {
  await ensureMailSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM gmail_notifications
        WHERE connection_id = $1 AND gmail_message_id = $2
        FOR UPDATE`,
      [input.connectionId, input.gmailMessageId],
    );
    let notificationId = existing.rows[0]?.id;
    const isNew = !notificationId;

    if (notificationId) {
      await client.query(
        `UPDATE gmail_notifications
            SET sender_domain = $2, sender_address = $3, service_name = $4,
                message_category = $5, received_at = $6, subject = $7,
                recipient = $8, body_text = $9, snippet = $10,
                headers = $11::jsonb, content_fetched_at = now()
          WHERE id = $1 AND user_id = $12`,
        [
          notificationId, input.senderDomain, input.senderAddress, input.serviceName,
          input.messageCategory, input.receivedAt, input.subject, input.recipient,
          input.bodyText, input.snippet, JSON.stringify(input.headers), input.userId,
        ],
      );
    } else {
      notificationId = randomUUID();
      await client.query(
        `INSERT INTO gmail_notifications
           (id, user_id, connection_id, gmail_message_id, sender_domain, sender_address,
            service_name, message_category, received_at, subject, recipient, body_text,
            snippet, headers, content_fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, now())`,
        [
          notificationId, input.userId, input.connectionId, input.gmailMessageId,
          input.senderDomain, input.senderAddress, input.serviceName, input.messageCategory,
          input.receivedAt, input.subject, input.recipient, input.bodyText, input.snippet,
          JSON.stringify(input.headers),
        ],
      );
    }

    await client.query(
      "DELETE FROM gmail_attachments WHERE user_id = $1 AND notification_id = $2",
      [input.userId, notificationId],
    );
    for (const attachment of input.attachments) {
      await client.query(
        `INSERT INTO gmail_attachments
           (id, user_id, notification_id, filename, mime_type, byte_size, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(), input.userId, notificationId, attachment.filename,
          attachment.mimeType, attachment.data.length, attachment.data,
        ],
      );
    }

    if (isNew) {
      await client.query(
        `INSERT INTO connected_services (id, user_id, service_name, notification_count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (user_id, service_name) DO UPDATE SET
           last_detected_at = now(),
           notification_count = connected_services.notification_count + 1`,
        [randomUUID(), input.userId, input.serviceName],
      );
    }

    await client.query("COMMIT");
    return isNew;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reclassifies previously stored metadata with the current curated service
 * registry. No Gmail API request or message-content access is performed.
 */
export async function reclassifyStoredNotifications(userId: string) {
  await ensureMailSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const rows = await client.query<{
      id: string;
      sender_address: string;
      sender_domain: string;
      service_name: string;
      message_category: string;
      received_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, sender_address, sender_domain, service_name, message_category, received_at, created_at
         FROM gmail_notifications
        WHERE user_id = $1`,
      [userId],
    );

    let changed = 0;
    for (const row of rows.rows) {
      const match = identifyService(row.sender_address, row.sender_domain);
      if (row.service_name === match.service && row.message_category === match.category) continue;
      await client.query(
        `UPDATE gmail_notifications
            SET service_name = $2, message_category = $3
          WHERE id = $1`,
        [row.id, match.service, match.category],
      );
      changed += 1;
    }

    // Rebuild per-user aggregates so services renamed by the registry are
    // reflected accurately and notification counts remain consistent.
    await client.query("DELETE FROM connected_services WHERE user_id = $1", [userId]);
    await client.query(
      `INSERT INTO connected_services
         (id, user_id, service_name, first_detected_at, last_detected_at, notification_count)
       SELECT md5($1 || ':' || service_name || ':' || count(*)::text),
              $1,
              service_name,
              min(COALESCE(received_at, created_at)),
              max(COALESCE(received_at, created_at)),
              count(*)::int
         FROM gmail_notifications
        WHERE user_id = $1
        GROUP BY service_name`,
      [userId],
    );

    await client.query("COMMIT");
    return { scanned: rows.rowCount ?? rows.rows.length, changed };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getNotificationForUser(userId: string, notificationId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{
    id: string;
    gmail_message_id: string;
    service_name: string;
    message_category: string;
    sender_domain: string;
    sender_address: string;
    received_at: Date | null;
    processing_status: string;
    created_at: Date;
    subject: string;
    recipient: string;
    body_text: string;
    snippet: string;
    headers: Record<string, string>;
    content_fetched_at: Date | null;
  }>(
    `SELECT id, gmail_message_id, service_name, message_category, sender_domain, sender_address,
            received_at, processing_status, created_at, subject, recipient, body_text, snippet,
            headers, content_fetched_at
       FROM gmail_notifications
      WHERE user_id = $1 AND id = $2
      LIMIT 1`,
    [userId, notificationId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const attachments = await getPool().query<{
    id: string; filename: string; mime_type: string; byte_size: string;
  }>(
    `SELECT id, filename, mime_type, byte_size
       FROM gmail_attachments
      WHERE user_id = $1 AND notification_id = $2
      ORDER BY created_at ASC`,
    [userId, notificationId],
  );

  return {
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    serviceName: row.service_name,
    messageCategory: row.message_category,
    senderDomain: row.sender_domain,
    senderAddress: row.sender_address,
    receivedAt: row.received_at,
    processingStatus: row.processing_status,
    createdAt: row.created_at,
    subject: row.subject,
    recipient: row.recipient,
    bodyText: row.body_text,
    snippet: row.snippet,
    headers: row.headers ?? {},
    contentFetchedAt: row.content_fetched_at,
    attachments: attachments.rows.map((item) => ({
      id: item.id,
      filename: item.filename,
      mimeType: item.mime_type,
      byteSize: Number(item.byte_size),
    })),
  };
}

export async function getAttachmentForUser(userId: string, attachmentId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{
    filename: string; mime_type: string; content: Buffer;
  }>(
    `SELECT filename, mime_type, content
       FROM gmail_attachments
      WHERE user_id = $1 AND id = $2
      LIMIT 1`,
    [userId, attachmentId],
  );
  return result.rows[0] ?? null;
}

export async function listNotifications(userId: string, limit = 50) {
  await ensureMailSchema();
  const result = await getPool().query<{
    id: string;
    gmail_message_id: string;
    service_name: string;
    message_category: string;
    sender_domain: string;
    sender_address: string;
    received_at: Date | null;
    processing_status: string;
    created_at: Date;
  }>(
    `SELECT id, gmail_message_id, service_name, message_category, sender_domain, sender_address, received_at,
            processing_status, created_at
       FROM gmail_notifications
      WHERE user_id = $1
      ORDER BY COALESCE(received_at, created_at) DESC
      LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );

  return result.rows.map<MailNotification>((row) => ({
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    serviceName: row.service_name,
    messageCategory: row.message_category,
    senderDomain: row.sender_domain,
    senderAddress: row.sender_address,
    receivedAt: row.received_at,
    processingStatus: row.processing_status,
    createdAt: row.created_at,
  }));
}

export async function getMailSummary(userId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{
    total: number;
    services: number;
    security: number;
    last_activity: Date | null;
  }>(
    `SELECT
       (SELECT count(*)::int FROM gmail_notifications WHERE user_id = $1) AS total,
       (SELECT count(*)::int FROM connected_services WHERE user_id = $1) AS services,
       (SELECT count(*)::int FROM gmail_notifications
         WHERE user_id = $1
           AND message_category IN ('security_notification', 'login_activity', 'account_alert', 'password_change_notice')
       ) AS security,
       (SELECT max(COALESCE(received_at, created_at)) FROM gmail_notifications WHERE user_id = $1) AS last_activity`,
    [userId],
  );

  const row = result.rows[0]!;
  return {
    totalNotifications: row.total,
    detectedServices: row.services,
    securityNotifications: row.security,
    lastActivity: row.last_activity,
  } satisfies MailSummary;
}

export async function listNotificationsForService(userId: string, serviceName: string) {
  await ensureMailSchema();
  const result = await getPool().query<{
    id: string;
    gmail_message_id: string;
    service_name: string;
    message_category: string;
    sender_domain: string;
    sender_address: string;
    received_at: Date | null;
    processing_status: string;
    created_at: Date;
  }>(
    `SELECT id, gmail_message_id, service_name, message_category, sender_domain, sender_address,
            received_at, processing_status, created_at
       FROM gmail_notifications
      WHERE user_id = $1 AND service_name = $2
      ORDER BY COALESCE(received_at, created_at) DESC
      LIMIT 100`,
    [userId, serviceName],
  );

  return result.rows.map<MailNotification>((row) => ({
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    serviceName: row.service_name,
    messageCategory: row.message_category,
    senderDomain: row.sender_domain,
    senderAddress: row.sender_address,
    receivedAt: row.received_at,
    processingStatus: row.processing_status,
    createdAt: row.created_at,
  }));
}

export async function listConnectedServices(userId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{
    service_name: string;
    first_detected_at: Date;
    last_detected_at: Date;
    notification_count: number;
  }>(
    `SELECT service_name, first_detected_at, last_detected_at, notification_count
       FROM connected_services
      WHERE user_id = $1
      ORDER BY last_detected_at DESC`,
    [userId],
  );

  return result.rows.map<ConnectedServiceSummary>((row) => ({
    serviceName: row.service_name,
    firstDetectedAt: row.first_detected_at,
    lastDetectedAt: row.last_detected_at,
    notificationCount: row.notification_count,
  }));
}

export async function listSyncEvents(connectionId: string, limit = 8) {
  await ensureMailSchema();
  const result = await getPool().query<{
    id: string;
    event_type: string;
    status: string;
    error_code: string | null;
    created_at: Date;
  }>(
    `SELECT id, event_type, status, error_code, created_at
       FROM gmail_sync_events
      WHERE connection_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [connectionId, Math.min(Math.max(limit, 1), 50)],
  );

  return result.rows.map<SyncEvent>((row) => ({
    id: row.id,
    eventType: row.event_type,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  }));
}

export async function listConnectionsDueForRenewal(withinMs: number, limit = 50) {
  await ensureMailSchema();
  const threshold = new Date(Date.now() + withinMs);
  const result = await getPool().query<ConnectionRow>(
    `SELECT ${CONNECTION_COLUMNS}
       FROM gmail_connections
      WHERE connection_status = 'active'
        AND (watch_expiration IS NULL OR watch_expiration < $1)
      ORDER BY watch_expiration NULLS FIRST
      LIMIT $2`,
    [threshold, limit],
  );
  return result.rows.map(toConnection);
}

export async function listStaleConnections(olderThanMs: number, limit = 50) {
  await ensureMailSchema();
  const threshold = new Date(Date.now() - olderThanMs);
  const result = await getPool().query<ConnectionRow>(
    `SELECT ${CONNECTION_COLUMNS}
       FROM gmail_connections
      WHERE connection_status = 'active'
        AND (last_sync_at IS NULL OR last_sync_at < $1)
      ORDER BY last_sync_at NULLS FIRST
      LIMIT $2`,
    [threshold, limit],
  );
  return result.rows.map(toConnection);
}

export async function getAdminMailSummary() {
  await ensureMailSchema();
  const pool = getPool();

  const [counts, services, lastActivity] = await Promise.all([
    pool.query<{
      total: number;
      active: number;
      inactive: number;
      pubsub: number;
      success: number;
      failed: number;
    }>(
      `SELECT
         (SELECT count(*)::int FROM gmail_connections) AS total,
         (SELECT count(*)::int FROM gmail_connections WHERE connection_status = 'active') AS active,
         (SELECT count(*)::int FROM gmail_connections WHERE connection_status <> 'active') AS inactive,
         (SELECT count(*)::int FROM gmail_sync_events WHERE event_type = 'pubsub') AS pubsub,
         (SELECT count(*)::int FROM gmail_sync_events WHERE status = 'success') AS success,
         (SELECT count(*)::int FROM gmail_sync_events WHERE status = 'failed') AS failed`,
    ),
    pool.query<{ service_name: string; connections: number; notifications: number }>(
      `SELECT service_name,
              count(*)::int AS connections,
              COALESCE(sum(notification_count), 0)::int AS notifications
         FROM connected_services
        GROUP BY service_name
        ORDER BY notifications DESC`,
    ),
    pool.query<{ last_activity: Date | null }>(
      `SELECT max(created_at) AS last_activity FROM gmail_sync_events`,
    ),
  ]);

  const row = counts.rows[0]!;
  return {
    totalConnections: row.total,
    activeConnections: row.active,
    disconnectedAccounts: row.inactive,
    pubsubEvents: row.pubsub,
    successfulSyncs: row.success,
    failedSyncs: row.failed,
    serviceCounts: services.rows.map((entry) => ({
      serviceName: entry.service_name,
      connections: entry.connections,
      notifications: entry.notifications,
    })),
    lastActivity: lastActivity.rows[0]?.last_activity ?? null,
  } satisfies AdminMailSummary;
}
