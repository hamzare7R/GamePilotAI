import { getPool } from "@/server/db/pool";
import { ensureMailSchema } from "@/server/mail/schema";

export const ADMIN_USERS_PAGE_SIZE = 25;

export type AdminSessionFilter = "all" | "active" | "expired" | "none";
export type AdminGmailFilter = "all" | "connected" | "error" | "revoked" | "none";
export type AdminUserSort = "newest" | "oldest" | "name" | "notifications" | "storage" | "last_login";

export type AdminUserSummary = {
  totalUsers: number;
  usersWithActiveSessions: number;
  gmailConnected: number;
  usersWithoutGmail: number;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  totalSessions: number;
  activeSessions: number;
  lastLoginAt: string | null;
  gmail: {
    emailAddress: string;
    status: string;
    lastSyncAt: string | null;
    watchExpiration: string | null;
  } | null;
  totalNotifications: number;
  totalAttachments: number;
  attachmentBytes: number;
};

export type AdminUserListResult = {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdminUserSession = {
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
};

export type AdminUserService = {
  serviceName: string;
  notificationCount: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
};

export type AdminUserEvent = {
  id: string;
  eventType: string;
  status: string;
  errorCode: string | null;
  createdAt: string;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  sessions: {
    totalSessions: number;
    activeSessions: number;
    lastLoginAt: string | null;
    items: AdminUserSession[];
  };
  gmail: {
    emailAddress: string;
    status: string;
    lastSyncAt: string | null;
    watchExpiration: string | null;
    connectedAt: string | null;
  } | null;
  mail: {
    totalNotifications: number;
    securityNotifications: number;
    totalAttachments: number;
    attachmentBytes: number;
    lastNotificationAt: string | null;
  };
  services: AdminUserService[];
  events: AdminUserEvent[];
};

const SECURITY_CATEGORIES_SQL = `'security_notification','login_activity','account_alert','password_change_notice'`;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toSafeNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function getAdminUserSummary(): Promise<AdminUserSummary> {
  await ensureMailSchema();
  const result = await getPool().query<{
    total_users: number;
    users_with_active_sessions: number;
    gmail_connected: number;
    users_without_gmail: number;
  }>(
    `SELECT
       (SELECT count(*)::int FROM users) AS total_users,
       (SELECT count(DISTINCT user_id)::int FROM user_sessions WHERE expires_at > now())
         AS users_with_active_sessions,
       (SELECT count(*)::int FROM gmail_connections WHERE connection_status = 'active')
         AS gmail_connected,
       (SELECT count(*)::int FROM users u
         WHERE NOT EXISTS (SELECT 1 FROM gmail_connections c WHERE c.user_id = u.id))
         AS users_without_gmail`,
  );

  const row = result.rows[0];
  if (!row) throw new Error("User summary query returned no rows.");

  return {
    totalUsers: row.total_users,
    usersWithActiveSessions: row.users_with_active_sessions,
    gmailConnected: row.gmail_connected,
    usersWithoutGmail: row.users_without_gmail,
  };
}

export async function listAdminUsers(input: {
  query?: string;
  session?: AdminSessionFilter;
  gmail?: AdminGmailFilter;
  sort?: AdminUserSort;
  page?: number;
}): Promise<AdminUserListResult> {
  await ensureMailSchema();
  const pool = getPool();

  const query = input.query?.trim() ?? "";
  const session = input.session ?? "all";
  const gmail = input.gmail ?? "all";
  const sort = input.sort ?? "newest";

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query) {
    params.push(likePattern(query));
    conditions.push(`(u.email ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`);
  }

  if (session === "active") {
    conditions.push(
      `EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > now())`,
    );
  } else if (session === "expired") {
    conditions.push(
      `EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > now())`,
    );
  } else if (session === "none") {
    conditions.push(`NOT EXISTS (SELECT 1 FROM user_sessions s WHERE s.user_id = u.id)`);
  }

  if (gmail === "none") {
    conditions.push(`c.id IS NULL`);
  } else if (gmail !== "all") {
    params.push(gmail === "connected" ? "active" : gmail);
    conditions.push(`c.connection_status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderBy: Record<AdminUserSort, string> = {
    newest: "u.created_at DESC, u.id DESC",
    oldest: "u.created_at ASC, u.id ASC",
    name: "NULLIF(u.display_name, '') ASC NULLS LAST, u.email ASC",
    notifications: "notification_stats.total_notifications DESC, u.created_at DESC",
    storage: "attachment_stats.attachment_bytes DESC, u.created_at DESC",
    last_login: "session_stats.last_session_at DESC NULLS LAST, u.created_at DESC",
  };

  const countResult = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total
       FROM users u
       LEFT JOIN gmail_connections c ON c.user_id = u.id
       ${where}`,
    params,
  );

  const total = countResult.rows[0]?.total ?? 0;
  const pageSize = ADMIN_USERS_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Math.trunc(input.page ?? 1), 1), pageCount);
  const offset = (page - 1) * pageSize;

  const listResult = await pool.query<{
    id: string;
    email: string;
    display_name: string;
    created_at: Date;
    total_sessions: number;
    active_sessions: number;
    last_session_at: Date | null;
    gmail_email: string | null;
    connection_status: string | null;
    last_sync_at: Date | null;
    watch_expiration: Date | null;
    total_notifications: number;
    total_attachments: number;
    attachment_bytes: string;
  }>(
    `SELECT u.id, u.email, u.display_name, u.created_at,
            session_stats.total_sessions, session_stats.active_sessions, session_stats.last_session_at,
            c.email_address AS gmail_email, c.connection_status, c.last_sync_at, c.watch_expiration,
            notification_stats.total_notifications,
            attachment_stats.total_attachments, attachment_stats.attachment_bytes
       FROM users u
       LEFT JOIN LATERAL (
         SELECT count(*)::int AS total_sessions,
                count(*) FILTER (WHERE s.expires_at > now())::int AS active_sessions,
                max(s.created_at) AS last_session_at
           FROM user_sessions s
          WHERE s.user_id = u.id
       ) session_stats ON true
       LEFT JOIN gmail_connections c ON c.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT count(*)::int AS total_notifications
           FROM gmail_notifications n
          WHERE n.user_id = u.id
       ) notification_stats ON true
       LEFT JOIN LATERAL (
         SELECT count(*)::int AS total_attachments,
                COALESCE(sum(a.byte_size), 0)::bigint AS attachment_bytes
           FROM gmail_attachments a
          WHERE a.user_id = u.id
       ) attachment_stats ON true
       ${where}
      ORDER BY ${orderBy[sort]}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset],
  );

  return {
    users: listResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at.toISOString(),
      totalSessions: row.total_sessions,
      activeSessions: row.active_sessions,
      lastLoginAt: toIso(row.last_session_at),
      gmail:
        row.connection_status !== null
          ? {
              emailAddress: row.gmail_email ?? "",
              status: row.connection_status,
              lastSyncAt: toIso(row.last_sync_at),
              watchExpiration: toIso(row.watch_expiration),
            }
          : null,
      totalNotifications: row.total_notifications,
      totalAttachments: row.total_attachments,
      attachmentBytes: toSafeNumber(row.attachment_bytes),
    })),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await ensureMailSchema();
  const pool = getPool();

  const baseResult = await pool.query<{
    id: string;
    email: string;
    display_name: string;
    created_at: Date;
    connection_id: string | null;
    gmail_email: string | null;
    connection_status: string | null;
    last_sync_at: Date | null;
    watch_expiration: Date | null;
    connected_at: Date | null;
    total_sessions: number;
    active_sessions: number;
    last_session_at: Date | null;
  }>(
    `SELECT u.id, u.email, u.display_name, u.created_at,
            c.id AS connection_id, c.email_address AS gmail_email, c.connection_status,
            c.last_sync_at, c.watch_expiration, c.created_at AS connected_at,
            (SELECT count(*)::int FROM user_sessions s WHERE s.user_id = u.id) AS total_sessions,
            (SELECT count(*)::int FROM user_sessions s
              WHERE s.user_id = u.id AND s.expires_at > now()) AS active_sessions,
            (SELECT max(s.created_at) FROM user_sessions s WHERE s.user_id = u.id) AS last_session_at
       FROM users u
       LEFT JOIN gmail_connections c ON c.user_id = u.id
      WHERE u.id = $1
      LIMIT 1`,
    [userId],
  );

  const base = baseResult.rows[0];
  if (!base) return null;

  const [sessionsResult, mailResult, servicesResult, eventsResult] = await Promise.all([
    pool.query<{ created_at: Date; expires_at: Date; is_active: boolean }>(
      `SELECT created_at, expires_at, (expires_at > now()) AS is_active
         FROM user_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20`,
      [userId],
    ),
    pool.query<{
      total_notifications: number;
      security_notifications: number;
      total_attachments: number;
      attachment_bytes: string;
      last_notification_at: Date | null;
    }>(
      `SELECT
         (SELECT count(*)::int FROM gmail_notifications WHERE user_id = $1)
           AS total_notifications,
         (SELECT count(*)::int FROM gmail_notifications
           WHERE user_id = $1 AND message_category IN (${SECURITY_CATEGORIES_SQL}))
           AS security_notifications,
         (SELECT count(*)::int FROM gmail_attachments WHERE user_id = $1)
           AS total_attachments,
         (SELECT COALESCE(sum(byte_size), 0)::bigint FROM gmail_attachments WHERE user_id = $1)
           AS attachment_bytes,
         (SELECT max(COALESCE(received_at, created_at)) FROM gmail_notifications WHERE user_id = $1)
           AS last_notification_at`,
      [userId],
    ),
    pool.query<{
      service_name: string;
      notification_count: number;
      first_detected_at: Date;
      last_detected_at: Date;
    }>(
      `SELECT service_name, notification_count, first_detected_at, last_detected_at
         FROM connected_services
        WHERE user_id = $1
        ORDER BY last_detected_at DESC`,
      [userId],
    ),
    base.connection_id
      ? pool.query<{
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
            LIMIT 10`,
          [base.connection_id],
        )
      : Promise.resolve({ rows: [] as Array<{
          id: string;
          event_type: string;
          status: string;
          error_code: string | null;
          created_at: Date;
        }> }),
  ]);

  const mail = mailResult.rows[0];

  return {
    id: base.id,
    email: base.email,
    displayName: base.display_name,
    createdAt: base.created_at.toISOString(),
    sessions: {
      totalSessions: base.total_sessions,
      activeSessions: base.active_sessions,
      lastLoginAt: toIso(base.last_session_at),
      items: sessionsResult.rows.map((row) => ({
        createdAt: row.created_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        isActive: row.is_active,
      })),
    },
    gmail:
      base.connection_status !== null
        ? {
            emailAddress: base.gmail_email ?? "",
            status: base.connection_status,
            lastSyncAt: toIso(base.last_sync_at),
            watchExpiration: toIso(base.watch_expiration),
            connectedAt: toIso(base.connected_at),
          }
        : null,
    mail: {
      totalNotifications: mail?.total_notifications ?? 0,
      securityNotifications: mail?.security_notifications ?? 0,
      totalAttachments: mail?.total_attachments ?? 0,
      attachmentBytes: toSafeNumber(mail?.attachment_bytes),
      lastNotificationAt: toIso(mail?.last_notification_at),
    },
    services: servicesResult.rows.map((row) => ({
      serviceName: row.service_name,
      notificationCount: row.notification_count,
      firstDetectedAt: row.first_detected_at.toISOString(),
      lastDetectedAt: row.last_detected_at.toISOString(),
    })),
    events: eventsResult.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      status: row.status,
      errorCode: row.error_code,
      createdAt: row.created_at.toISOString(),
    })),
  };
}
