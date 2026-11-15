import { randomUUID } from "node:crypto";

import { getPool } from "@/server/db/pool";

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
  const result = await getPool().query<{ email_address: string; encrypted_refresh_token: string }>(
    `DELETE FROM gmail_connections WHERE user_id = $1
     RETURNING email_address, encrypted_refresh_token`,
    [userId],
  );
  const row = result.rows[0];
  return row ? { emailAddress: row.email_address, encryptedRefreshToken: row.encrypted_refresh_token } : null;
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
     ON CONFLICT (pubsub_message_id) DO NOTHING
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
     ON CONFLICT (pubsub_message_id) DO NOTHING
     RETURNING id`,
    [randomUUID(), connectionId, messageId],
  );
  return result.rows[0]?.id ?? null;
}

export async function insertNotification(input: {  userId: string;
  connectionId: string;
  gmailMessageId: string;
  senderDomain: string;
  senderAddress: string;
  serviceName: string;
  messageCategory: string;
  receivedAt: Date | null;
}) {
  await ensureMailSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO gmail_notifications
         (id, user_id, connection_id, gmail_message_id, sender_domain, sender_address,
          service_name, message_category, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (connection_id, gmail_message_id) DO NOTHING
       RETURNING id`,
      [
        randomUUID(),
        input.userId,
        input.connectionId,
        input.gmailMessageId,
        input.senderDomain,
        input.senderAddress,
        input.serviceName,
        input.messageCategory,
        input.receivedAt,
      ],
    );

    if (inserted.rowCount === 1) {
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
    return inserted.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function listNotifications(userId: string, limit = 50) {
  await ensureMailSchema();
  const result = await getPool().query<{
    id: string;
    service_name: string;
    message_category: string;
    sender_domain: string;
    sender_address: string;
    received_at: Date | null;
    processing_status: string;
    created_at: Date;
  }>(
    `SELECT id, service_name, message_category, sender_domain, sender_address, received_at,
            processing_status, created_at
       FROM gmail_notifications
      WHERE user_id = $1
      ORDER BY COALESCE(received_at, created_at) DESC
      LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );

  return result.rows.map<MailNotification>((row) => ({
    id: row.id,
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
