import { cache } from "react";

import { isGmailConfigured } from "@/lib/gmail/env";
import { getPool, isDatabaseConfigured } from "@/server/db/pool";
import { ensureMailSchema } from "@/server/mail/schema";

export type AdminSystemStatus = {
  databaseReachable: boolean;
  latencyMs: number | null;
  reason: "not_configured" | "unreachable" | null;
};

export type AdminOverviewMetrics = {
  totalUsers: number | null;
  activeUsers: number | null;
  gmailConnections: number | null;
  activeGmailConnections: number | null;
  totalNotifications: number | null;
  totalAttachments: number | null;
  attachmentBytes: number | null;
  messageTextBytes: number | null;
  connectedServices: number | null;
};

export type AdminActivityEvent = {
  id: string;
  eventType: string;
  status: string;
  errorCode: string | null;
  createdAt: string;
};

export type AdminOverview = {
  databaseStatus: "operational" | "not_configured" | "unreachable";
  generatedAt: string;
  metrics: AdminOverviewMetrics;
  health: {
    latencyMs: number | null;
    gmailConfigured: boolean;
    activeWatches: number | null;
    lastSyncAt: string | null;
  };
  activity: AdminActivityEvent[];
};

function describeError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return error instanceof Error ? error.name : "unknown";
}

/**
 * One lightweight probe per request. React caches the result so the admin
 * layout and the overview page share a single round trip.
 */
export const getAdminSystemStatus = cache(async (): Promise<AdminSystemStatus> => {
  if (!isDatabaseConfigured()) {
    return { databaseReachable: false, latencyMs: null, reason: "not_configured" };
  }

  try {
    const startedAt = Date.now();
    await getPool().query("SELECT 1");
    return { databaseReachable: true, latencyMs: Date.now() - startedAt, reason: null };
  } catch (error) {
    console.error("[admin:overview] database probe failed:", describeError(error));
    return { databaseReachable: false, latencyMs: null, reason: "unreachable" };
  }
});

function toNumber(value: string | number | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const EMPTY_METRICS: AdminOverviewMetrics = {
  totalUsers: null,
  activeUsers: null,
  gmailConnections: null,
  activeGmailConnections: null,
  totalNotifications: null,
  totalAttachments: null,
  attachmentBytes: null,
  messageTextBytes: null,
  connectedServices: null,
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const status = await getAdminSystemStatus();
  const databaseStatus: AdminOverview["databaseStatus"] = status.reason ?? "operational";

  const overview: AdminOverview = {
    databaseStatus,
    generatedAt: new Date().toISOString(),
    metrics: { ...EMPTY_METRICS },
    health: {
      latencyMs: status.latencyMs,
      gmailConfigured: isGmailConfigured(),
      activeWatches: null,
      lastSyncAt: null,
    },
    activity: [],
  };

  if (!status.databaseReachable) return overview;

  try {
    await ensureMailSchema();
    const pool = getPool();

    const [counts, storage, events] = await Promise.all([
      pool.query<{
        total_users: number;
        active_users: number;
        gmail_connections: number;
        active_gmail_connections: number;
        total_notifications: number;
        total_attachments: number;
        connected_services: number;
        active_watches: number;
        last_sync_at: Date | null;
      }>(
        `SELECT
           (SELECT count(*)::int FROM users) AS total_users,
           (SELECT count(DISTINCT user_id)::int FROM user_sessions WHERE expires_at > now()) AS active_users,
           (SELECT count(*)::int FROM gmail_connections) AS gmail_connections,
           (SELECT count(*)::int FROM gmail_connections WHERE connection_status = 'active') AS active_gmail_connections,
           (SELECT count(*)::int FROM gmail_notifications) AS total_notifications,
           (SELECT count(*)::int FROM gmail_attachments) AS total_attachments,
           (SELECT count(DISTINCT service_name)::int FROM connected_services) AS connected_services,
           (SELECT count(*)::int FROM gmail_connections
             WHERE connection_status = 'active' AND watch_expiration > now()) AS active_watches,
           (SELECT max(last_sync_at) FROM gmail_connections) AS last_sync_at`,
      ),
      pool.query<{ attachment_bytes: string | null; message_text_bytes: string | null }>(
        `SELECT
           COALESCE((SELECT sum(byte_size) FROM gmail_attachments), 0)::bigint AS attachment_bytes,
           COALESCE((
             SELECT sum(
               octet_length(subject) + octet_length(recipient) +
               octet_length(body_text) + octet_length(snippet)
             )
             FROM gmail_notifications
           ), 0)::bigint AS message_text_bytes`,
      ),
      pool.query<{
        id: string;
        event_type: string;
        status: string;
        error_code: string | null;
        created_at: Date;
      }>(
        `SELECT id, event_type, status, error_code, created_at
           FROM gmail_sync_events
          ORDER BY created_at DESC
          LIMIT 8`,
      ),
    ]);

    const row = counts.rows[0];
    const storageRow = storage.rows[0];

    if (row) {
      overview.metrics = {
        totalUsers: row.total_users,
        activeUsers: row.active_users,
        gmailConnections: row.gmail_connections,
        activeGmailConnections: row.active_gmail_connections,
        totalNotifications: row.total_notifications,
        totalAttachments: row.total_attachments,
        attachmentBytes: toNumber(storageRow?.attachment_bytes ?? null),
        messageTextBytes: toNumber(storageRow?.message_text_bytes ?? null),
        connectedServices: row.connected_services,
      };
      overview.health = {
        ...overview.health,
        activeWatches: row.active_watches,
        lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : null,
      };
    }

    overview.activity = events.rows.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      status: event.status,
      errorCode: event.error_code,
      createdAt: event.created_at.toISOString(),
    }));
  } catch (error) {
    console.error("[admin:overview] aggregate queries failed:", describeError(error));
    overview.metrics = { ...EMPTY_METRICS };
  }

  overview.generatedAt = new Date().toISOString();
  return overview;
}
