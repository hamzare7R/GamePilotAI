import { getGmailConfig } from "@/lib/gmail/env";
import { getMessageHtmlContent } from "@/lib/gmail/gmail-client";
import { fetchGmailProfile, refreshAccessToken } from "@/lib/gmail/oauth";
import { decryptToken } from "@/lib/gmail/token-encryption";
import { getPool } from "@/server/db/pool";
import { getConnectionForUser } from "@/server/mail/repository";
import { ensureMailSchema } from "@/server/mail/schema";

export const ADMIN_USERS_PAGE_SIZE = 25;
export const ADMIN_USER_MESSAGES_PAGE_SIZE = 10;
export const ADMIN_USER_ATTACHMENTS_PAGE_SIZE = 10;

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

export type AdminUserMessageListItem = {
  id: string;
  gmailMessageId: string;
  subject: string;
  sender: string;
  recipient: string;
  serviceName: string;
  messageCategory: string;
  receivedAt: string | null;
  createdAt: string;
  contentFetchedAt: string | null;
  contentBytes: number;
  attachmentCount: number;
};

export type AdminUserMessageListResult = {
  messages: AdminUserMessageListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdminUserMessageHtmlResult = {
  ok: boolean;
  code: string | null;
  message: string;
  html: string | null;
  text: string | null;
};

export type AdminUserMessageDetail = AdminUserMessageListItem & {
  bodyText: string;
  snippet: string;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    byteSize: number;
    actualBytes: number;
  }>;
};

export type AdminUserAttachmentListItem = {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  actualBytes: number;
  parentNotificationId: string;
  parentSubject: string;
  parentGmailMessageId: string;
  parentReceivedAt: string | null;
  createdAt: string;
};

export type AdminUserAttachmentListResult = {
  attachments: AdminUserAttachmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdminUserOAuthDiagnostics = {
  configConfigured: boolean;
  configProblems: string[];
  tokenStored: boolean;
  tokenEncrypted: boolean;
  tokenDecryptable: boolean;
  lastRefreshEvidenceAt: string | null;
  lastOAuthErrorCode: string | null;
};

export type AdminUserSyncDiagnostics = {
  totalMessages: number;
  messagesWithContent: number;
  messagesWithoutContent: number;
  messageTextBytes: number;
  totalAttachments: number;
  attachmentsWithContent: number;
  attachmentBytes: number;
  attachmentSizeMismatches: number;
  pendingSyncMessages: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorCode: string | null;
};

export type AdminUserOAuthTestMode = "connection" | "refresh";

export type AdminUserOAuthTestResult = {
  mode: AdminUserOAuthTestMode;
  ok: boolean;
  checkedAt: string;
  code: string | null;
  message: string;
  emailMatches: boolean | null;
  expiresInSeconds: number | null;
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
  oauth: AdminUserOAuthDiagnostics;
  sync: AdminUserSyncDiagnostics;
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

function safeDiagnosticCode(error: unknown, fallback: string) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code) ? code : fallback;
}

export async function listAdminUserMessages(input: {
  userId: string;
  page?: number;
}): Promise<AdminUserMessageListResult> {
  await ensureMailSchema();
  const pool = getPool();
  const pageSize = ADMIN_USER_MESSAGES_PAGE_SIZE;

  const countResult = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM gmail_notifications WHERE user_id = $1`,
    [input.userId],
  );
  const total = countResult.rows[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Math.trunc(input.page ?? 1), 1), pageCount);
  const offset = (page - 1) * pageSize;

  const result = await pool.query<{
    id: string;
    gmail_message_id: string;
    subject: string;
    sender_address: string;
    recipient: string;
    service_name: string;
    message_category: string;
    received_at: Date | null;
    created_at: Date;
    content_fetched_at: Date | null;
    content_bytes: number;
    attachment_count: number;
  }>(
    `SELECT n.id, n.gmail_message_id, n.subject, n.sender_address, n.recipient,
            n.service_name, n.message_category, n.received_at, n.created_at,
            n.content_fetched_at, octet_length(n.body_text)::int AS content_bytes,
            (SELECT count(*)::int FROM gmail_attachments a
              WHERE a.user_id = n.user_id AND a.notification_id = n.id) AS attachment_count
       FROM gmail_notifications n
      WHERE n.user_id = $1
      ORDER BY COALESCE(n.received_at, n.created_at) DESC, n.id DESC
      LIMIT $2 OFFSET $3`,
    [input.userId, pageSize, offset],
  );

  return {
    messages: result.rows.map((row) => ({
      id: row.id,
      gmailMessageId: row.gmail_message_id,
      subject: row.subject,
      sender: row.sender_address,
      recipient: row.recipient,
      serviceName: row.service_name,
      messageCategory: row.message_category,
      receivedAt: toIso(row.received_at),
      createdAt: row.created_at.toISOString(),
      contentFetchedAt: toIso(row.content_fetched_at),
      contentBytes: row.content_bytes,
      attachmentCount: row.attachment_count,
    })),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getAdminUserMessage(userId: string, messageId: string) {
  await ensureMailSchema();
  const pool = getPool();

  const result = await pool.query<{
    id: string;
    gmail_message_id: string;
    subject: string;
    sender_address: string;
    recipient: string;
    service_name: string;
    message_category: string;
    received_at: Date | null;
    created_at: Date;
    content_fetched_at: Date | null;
    content_bytes: number;
    body_text: string;
    snippet: string;
    attachment_count: number;
  }>(
    `SELECT n.id, n.gmail_message_id, n.subject, n.sender_address, n.recipient,
            n.service_name, n.message_category, n.received_at, n.created_at,
            n.content_fetched_at, octet_length(n.body_text)::int AS content_bytes,
            n.body_text, n.snippet,
            (SELECT count(*)::int FROM gmail_attachments a
              WHERE a.user_id = n.user_id AND a.notification_id = n.id) AS attachment_count
       FROM gmail_notifications n
      WHERE n.user_id = $1 AND n.id = $2
      LIMIT 1`,
    [userId, messageId],
  );
  const row = result.rows[0];
  if (!row) return null;

  const attachments = await pool.query<{
    id: string;
    filename: string;
    mime_type: string;
    byte_size: string;
    actual_bytes: number;
  }>(
    `SELECT id, filename, mime_type, byte_size, octet_length(content)::int AS actual_bytes
       FROM gmail_attachments
      WHERE user_id = $1 AND notification_id = $2
      ORDER BY created_at ASC`,
    [userId, messageId],
  );

  return {
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    subject: row.subject,
    sender: row.sender_address,
    recipient: row.recipient,
    serviceName: row.service_name,
    messageCategory: row.message_category,
    receivedAt: toIso(row.received_at),
    createdAt: row.created_at.toISOString(),
    contentFetchedAt: toIso(row.content_fetched_at),
    contentBytes: row.content_bytes,
    bodyText: row.body_text,
    snippet: row.snippet,
    attachmentCount: row.attachment_count,
    attachments: attachments.rows.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mime_type,
      byteSize: toSafeNumber(attachment.byte_size),
      actualBytes: attachment.actual_bytes,
    })),
  } satisfies AdminUserMessageDetail;
}

/**
 * Fetches the original HTML body directly from Gmail on explicit owner action.
 * Stored mail only keeps plain text, so this is the only path to the HTML part;
 * nothing is persisted and tokens never leave this function.
 */
export async function fetchAdminUserMessageHtml(
  userId: string,
  messageId: string,
): Promise<AdminUserMessageHtmlResult> {
  await ensureMailSchema();
  const result = await getPool().query<{ gmail_message_id: string }>(
    `SELECT gmail_message_id FROM gmail_notifications WHERE user_id = $1 AND id = $2 LIMIT 1`,
    [userId, messageId],
  );
  const message = result.rows[0];
  if (!message) {
    return {
      ok: false,
      code: "MESSAGE_NOT_FOUND",
      message: "This message is not stored for this user.",
      html: null,
      text: null,
    };
  }

  if (!getGmailConfig().config) {
    return {
      ok: false,
      code: "GMAIL_NOT_CONFIGURED",
      message: "Gmail OAuth environment variables are incomplete or invalid.",
      html: null,
      text: null,
    };
  }

  const connection = await getConnectionForUser(userId);
  if (!connection || connection.status === "revoked" || !connection.encryptedRefreshToken) {
    return {
      ok: false,
      code: "GMAIL_NOT_CONNECTED",
      message: "This Gmail connection has no stored refresh token.",
      html: null,
      text: null,
    };
  }

  try {
    const refreshToken = decryptToken(connection.encryptedRefreshToken);
    const token = await refreshAccessToken(refreshToken);
    if (!token.access_token) {
      throw Object.assign(new Error("No access token returned."), { code: "TOKEN_REFRESH_EMPTY" });
    }
    const content = await getMessageHtmlContent(token.access_token, message.gmail_message_id);
    return {
      ok: true,
      code: null,
      message: "Original content fetched from Gmail.",
      html: content.html,
      text: content.text,
    };
  } catch (error) {
    const code = safeDiagnosticCode(error, "MESSAGE_FETCH_FAILED");
    console.error("[admin:message-html] failed:", code);
    return {
      ok: false,
      code,
      message: "Gmail did not return this message. Check the server logs using this code.",
      html: null,
      text: null,
    };
  }
}

export async function listAdminUserAttachments(input: {
  userId: string;
  page?: number;
}): Promise<AdminUserAttachmentListResult> {
  await ensureMailSchema();
  const pool = getPool();
  const pageSize = ADMIN_USER_ATTACHMENTS_PAGE_SIZE;

  const countResult = await pool.query<{ total: number }>(
    `SELECT count(*)::int AS total
       FROM gmail_attachments a
       JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
      WHERE a.user_id = $1`,
    [input.userId],
  );
  const total = countResult.rows[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Math.trunc(input.page ?? 1), 1), pageCount);
  const offset = (page - 1) * pageSize;

  const result = await pool.query<{
    id: string;
    filename: string;
    mime_type: string;
    byte_size: string;
    actual_bytes: number;
    notification_id: string;
    parent_subject: string;
    parent_gmail_message_id: string;
    parent_received_at: Date | null;
    created_at: Date;
  }>(
    `SELECT a.id, a.filename, a.mime_type, a.byte_size,
            octet_length(a.content)::int AS actual_bytes,
            a.notification_id, n.subject AS parent_subject,
            n.gmail_message_id AS parent_gmail_message_id,
            COALESCE(n.received_at, n.created_at) AS parent_received_at,
            a.created_at
       FROM gmail_attachments a
       JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
      WHERE a.user_id = $1
      ORDER BY COALESCE(n.received_at, n.created_at) DESC, a.created_at DESC, a.id DESC
      LIMIT $2 OFFSET $3`,
    [input.userId, pageSize, offset],
  );

  return {
    attachments: result.rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      byteSize: toSafeNumber(row.byte_size),
      actualBytes: row.actual_bytes,
      parentNotificationId: row.notification_id,
      parentSubject: row.parent_subject,
      parentGmailMessageId: row.parent_gmail_message_id,
      parentReceivedAt: toIso(row.parent_received_at),
      createdAt: row.created_at.toISOString(),
    })),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getAdminUserAttachmentContent(userId: string, attachmentId: string) {
  await ensureMailSchema();
  const result = await getPool().query<{
    filename: string;
    mime_type: string;
    byte_size: string;
    content: Buffer;
  }>(
    `SELECT a.filename, a.mime_type, a.byte_size, a.content
       FROM gmail_attachments a
       JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
      WHERE a.user_id = $1 AND a.id = $2
      LIMIT 1`,
    [userId, attachmentId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    filename: row.filename,
    mimeType: row.mime_type,
    recordedBytes: toSafeNumber(row.byte_size),
    content: row.content,
  };
}

export async function testAdminUserGmail(
  userId: string,
  mode: AdminUserOAuthTestMode,
): Promise<AdminUserOAuthTestResult> {
  const checkedAt = new Date().toISOString();
  const gmailConfig = getGmailConfig();
  if (!gmailConfig.config) {
    return {
      mode,
      ok: false,
      checkedAt,
      code: "GMAIL_NOT_CONFIGURED",
      message: "Gmail OAuth environment variables are incomplete or invalid.",
      emailMatches: null,
      expiresInSeconds: null,
    };
  }

  const connection = await getConnectionForUser(userId);
  if (!connection) {
    return {
      mode,
      ok: false,
      checkedAt,
      code: "NO_CONNECTION",
      message: "No Gmail connection is linked to this user.",
      emailMatches: null,
      expiresInSeconds: null,
    };
  }
  if (connection.status === "revoked" || !connection.encryptedRefreshToken) {
    return {
      mode,
      ok: false,
      checkedAt,
      code: "GMAIL_NOT_CONNECTED",
      message: "This Gmail connection has no stored refresh token.",
      emailMatches: null,
      expiresInSeconds: null,
    };
  }

  try {
    // The decrypted token is used only for this request and is never returned.
    const refreshToken = decryptToken(connection.encryptedRefreshToken);
    const token = await refreshAccessToken(refreshToken);
    if (!token.access_token) {
      throw Object.assign(new Error("No access token returned."), { code: "TOKEN_REFRESH_EMPTY" });
    }

    let emailMatches: boolean | null = null;
    if (mode === "connection") {
      const profile = await fetchGmailProfile(token.access_token);
      emailMatches = profile.emailAddress === connection.emailAddress.toLowerCase();
    }

    return {
      mode,
      ok: true,
      checkedAt,
      code: null,
      message:
        mode === "connection"
          ? "Google accepted the refresh token and returned this mailbox profile."
          : "Google accepted the refresh token and issued a new access token.",
      emailMatches,
      expiresInSeconds: token.expires_in ?? null,
    };
  } catch (error) {
    const code = safeDiagnosticCode(error, "OAUTH_TEST_FAILED");
    console.error("[admin:oauth-test] failed:", code);
    const message =
      code === "TOKEN_REFRESH_FAILED"
        ? "Google rejected the refresh token. The user may need to reconnect Gmail."
        : code === "GMAIL_AUTHORIZATION_FAILED"
          ? "Google rejected the access token while verifying the mailbox."
          : "The Gmail connection test failed. Check the server logs using this code.";
    return {
      mode,
      ok: false,
      checkedAt,
      code,
      message,
      emailMatches: null,
      expiresInSeconds: null,
    };
  }
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await ensureMailSchema();
  const pool = getPool();

  const gmailConfig = getGmailConfig();

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
    token_stored: boolean;
    token_encrypted: boolean;
    encrypted_refresh_token: string | null;
  }>(
    `SELECT u.id, u.email, u.display_name, u.created_at,
            c.id AS connection_id, c.email_address AS gmail_email, c.connection_status,
            c.last_sync_at, c.watch_expiration, c.created_at AS connected_at,
            c.encrypted_refresh_token,
            (c.encrypted_refresh_token <> '') AS token_stored,
            (c.encrypted_refresh_token ~ '^v1:[^:]+:[^:]+:[^:]+$') AS token_encrypted,
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

  const [sessionsResult, mailResult, servicesResult, eventsResult, diagnosticsResult] = await Promise.all([
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
    pool.query<{
      total_messages: number;
      messages_with_content: number;
      messages_without_content: number;
      message_text_bytes: string;
      total_attachments: number;
      attachments_with_content: number;
      attachment_bytes: string;
      attachment_size_mismatches: number;
      pending_sync_messages: number;
      last_success_at: Date | null;
      last_failure_at: Date | null;
      last_error_code: string | null;
      last_refresh_evidence_at: Date | null;
      last_oauth_error_code: string | null;
    }>(
      `SELECT
         (SELECT count(*)::int FROM gmail_notifications WHERE user_id = $1) AS total_messages,
         (SELECT count(*)::int FROM gmail_notifications
           WHERE user_id = $1 AND content_fetched_at IS NOT NULL) AS messages_with_content,
         (SELECT count(*)::int FROM gmail_notifications
           WHERE user_id = $1 AND content_fetched_at IS NULL) AS messages_without_content,
         (SELECT COALESCE(sum(octet_length(body_text)), 0)::bigint FROM gmail_notifications
           WHERE user_id = $1) AS message_text_bytes,
         (SELECT count(*)::int FROM gmail_attachments a
            JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
           WHERE a.user_id = $1) AS total_attachments,
         (SELECT count(*)::int FROM gmail_attachments a
            JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
           WHERE a.user_id = $1 AND octet_length(a.content) > 0) AS attachments_with_content,
         (SELECT COALESCE(sum(octet_length(a.content)), 0)::bigint FROM gmail_attachments a
            JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
           WHERE a.user_id = $1) AS attachment_bytes,
         (SELECT count(*)::int FROM gmail_attachments a
            JOIN gmail_notifications n ON n.id = a.notification_id AND n.user_id = a.user_id
           WHERE a.user_id = $1 AND octet_length(a.content) <> a.byte_size) AS attachment_size_mismatches,
         (SELECT count(*)::int FROM gmail_sync_queue WHERE user_id = $1) AS pending_sync_messages,
         (SELECT max(created_at) FROM gmail_sync_events
           WHERE connection_id = $2 AND event_type = 'sync' AND status = 'success') AS last_success_at,
         (SELECT max(created_at) FROM gmail_sync_events
           WHERE connection_id = $2 AND event_type = 'sync' AND status = 'failed') AS last_failure_at,
         (SELECT error_code FROM gmail_sync_events
           WHERE connection_id = $2 AND event_type = 'sync' AND status = 'failed'
           ORDER BY created_at DESC LIMIT 1) AS last_error_code,
         (SELECT max(created_at) FROM gmail_sync_events
           WHERE connection_id = $2 AND status = 'success'
             AND event_type IN ('sync', 'watch_renewed')) AS last_refresh_evidence_at,
         (SELECT error_code FROM gmail_sync_events
           WHERE connection_id = $2 AND status = 'failed'
             AND error_code IN ('TOKEN_REFRESH_FAILED', 'TOKEN_EXCHANGE_FAILED', 'GMAIL_AUTHORIZATION_FAILED')
           ORDER BY created_at DESC LIMIT 1) AS last_oauth_error_code`,
      [userId, base.connection_id],
    ),
  ]);

  const mail = mailResult.rows[0];
  const diagnostics = diagnosticsResult.rows[0];

  let tokenDecryptable = false;
  if (base.token_stored && gmailConfig.config) {
    try {
      // Decrypted only to confirm key/format integrity; the value is discarded.
      decryptToken(base.encrypted_refresh_token ?? "");
      tokenDecryptable = true;
    } catch {
      tokenDecryptable = false;
    }
  }

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
    oauth: {
      configConfigured: gmailConfig.config !== null,
      configProblems: gmailConfig.problems,
      tokenStored: base.token_stored,
      tokenEncrypted: base.token_encrypted,
      tokenDecryptable,
      lastRefreshEvidenceAt: toIso(diagnostics?.last_refresh_evidence_at),
      lastOAuthErrorCode: diagnostics?.last_oauth_error_code ?? null,
    },
    sync: {
      totalMessages: diagnostics?.total_messages ?? 0,
      messagesWithContent: diagnostics?.messages_with_content ?? 0,
      messagesWithoutContent: diagnostics?.messages_without_content ?? 0,
      messageTextBytes: toSafeNumber(diagnostics?.message_text_bytes),
      totalAttachments: diagnostics?.total_attachments ?? 0,
      attachmentsWithContent: diagnostics?.attachments_with_content ?? 0,
      attachmentBytes: toSafeNumber(diagnostics?.attachment_bytes),
      attachmentSizeMismatches: diagnostics?.attachment_size_mismatches ?? 0,
      pendingSyncMessages: diagnostics?.pending_sync_messages ?? 0,
      lastSuccessAt: toIso(diagnostics?.last_success_at),
      lastFailureAt: toIso(diagnostics?.last_failure_at),
      lastErrorCode: diagnostics?.last_error_code ?? null,
    },
  };
}
