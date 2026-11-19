import { getPool } from "@/server/db/pool";
import {
  SERVICE_PAGE_SIZE,
  SERVICE_USER_PAGE_SIZE,
  clampPage,
  isSafeServiceName,
  likePattern,
  matchingServiceKeys,
  toAggregateCount,
  type ServiceListParams,
  type ServiceSort,
  type ServiceUserListParams,
  type ServiceUserSort,
} from "@/lib/admin/services";

export type AdminServicesSummary = {
  detectedServices: number;
  usersWithDetections: number;
  notifications: number;
  lastDetectionAt: string | null;
  gmailMailboxes: {
    active: number;
    error: number;
    revoked: number;
  };
};

export type AdminServiceListItem = {
  serviceName: string;
  users: number;
  notifications: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  usersWithActiveGmail: number;
};

export type AdminServiceListResult = {
  services: AdminServiceListItem[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type AdminOtherSendersSummary = {
  users: number;
  notifications: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

export type AdminServiceDetail = {
  serviceName: string;
  users: number;
  notifications: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  usersWithActiveGmail: number;
};

export type AdminServiceUser = {
  userId: string;
  displayName: string;
  notificationCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  gmailStatus: string | null;
  gmailLastSyncAt: string | null;
};

export type AdminServiceUserListResult = {
  users: AdminServiceUser[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

type SummaryRow = {
  detected_services: number;
  users_with_detections: number;
  notifications: string | number;
  last_detection_at: Date | null;
  active_mailboxes: number;
  error_mailboxes: number;
  revoked_mailboxes: number;
};

type ServiceRow = {
  service_name: string;
  users: number;
  notifications: string | number;
  first_seen_at: Date | null;
  last_seen_at: Date | null;
  users_with_active_gmail: number;
};

type OtherRow = {
  users: number;
  notifications: string | number;
  first_seen_at: Date | null;
  last_seen_at: Date | null;
};

type DetailRow = {
  users: number;
  notifications: string | number;
  first_seen_at: Date | null;
  last_seen_at: Date | null;
  users_with_active_gmail: number;
};

type ServiceUserRow = {
  user_id: string;
  display_name: string;
  notification_count: number;
  first_detected_at: Date | null;
  last_detected_at: Date | null;
  connection_status: string | null;
  last_sync_at: Date | null;
};

type CountRow = {
  total: number;
};

const SUMMARY_SQL = `
  SELECT
    (
      SELECT count(DISTINCT cs.service_name)::int
      FROM connected_services cs
      WHERE cs.service_name <> 'other'
    ) AS detected_services,
    (
      SELECT count(DISTINCT cs.user_id)::int
      FROM connected_services cs
    ) AS users_with_detections,
    (
      SELECT COALESCE(sum(cs.notification_count), 0)::bigint
      FROM connected_services cs
    ) AS notifications,
    (
      SELECT max(cs.last_detected_at)
      FROM connected_services cs
    ) AS last_detection_at,
    (
      SELECT count(*)::int
      FROM gmail_connections gc
      WHERE gc.connection_status = 'active'
    ) AS active_mailboxes,
    (
      SELECT count(*)::int
      FROM gmail_connections gc
      WHERE gc.connection_status = 'error'
    ) AS error_mailboxes,
    (
      SELECT count(*)::int
      FROM gmail_connections gc
      WHERE gc.connection_status = 'revoked'
    ) AS revoked_mailboxes
`;

const OTHER_SQL = `
  SELECT
    count(*)::int AS users,
    COALESCE(sum(cs.notification_count), 0)::bigint AS notifications,
    min(cs.first_detected_at) AS first_seen_at,
    max(cs.last_detected_at) AS last_seen_at
  FROM connected_services cs
  WHERE cs.service_name = 'other'
`;

const DETAIL_SQL = `
  SELECT
    count(*)::int AS users,
    COALESCE(sum(cs.notification_count), 0)::bigint AS notifications,
    min(cs.first_detected_at) AS first_seen_at,
    max(cs.last_detected_at) AS last_seen_at,
    count(*) FILTER (WHERE gc.connection_status = 'active')::int AS users_with_active_gmail
  FROM connected_services cs
  LEFT JOIN gmail_connections gc ON gc.user_id = cs.user_id
  WHERE cs.service_name = $1
`;

// Static allowlist only. User input never reaches the ORDER BY clause.
const SERVICE_ORDER: Record<ServiceSort, string> = {
  users: "users DESC, cs.service_name ASC",
  notifications: "notifications DESC, cs.service_name ASC",
  first_seen: "first_seen_at ASC NULLS LAST, cs.service_name ASC",
  last_seen: "last_seen_at DESC NULLS LAST, cs.service_name ASC",
  active_gmail: "users_with_active_gmail DESC, cs.service_name ASC",
  name: "cs.service_name ASC",
};

const SERVICE_USER_ORDER: Record<ServiceUserSort, string> = {
  last_seen: "cs.last_detected_at DESC NULLS LAST, cs.user_id ASC",
  first_seen: "cs.first_detected_at ASC NULLS LAST, cs.user_id ASC",
  notifications: "cs.notification_count DESC, cs.user_id ASC",
  name: "NULLIF(u.display_name, '') ASC NULLS LAST, cs.user_id ASC",
  gmail_status:
    "CASE gc.connection_status WHEN 'active' THEN 0 WHEN 'error' THEN 1 WHEN 'revoked' THEN 2 ELSE 3 END ASC, cs.last_detected_at DESC NULLS LAST, cs.user_id ASC",
};

function toIso(value: Date | string | null) {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function serviceSearchClause(query: string, params: unknown[]) {
  if (!query) return "";

  params.push(likePattern(query));
  const likeIndex = params.length;
  const keys = matchingServiceKeys(query);
  params.push(keys);
  const keysIndex = params.length;

  return `AND (cs.service_name ILIKE $${likeIndex} OR cs.service_name = ANY($${keysIndex}::text[]))`;
}

function userSearchClause(query: string, params: unknown[]) {
  if (!query) return "";

  params.push(likePattern(query));
  const index = params.length;
  return `AND (u.display_name ILIKE $${index} OR u.id ILIKE $${index})`;
}

export async function getAdminServicesSummary(): Promise<AdminServicesSummary> {
  const result = await getPool().query<SummaryRow>(SUMMARY_SQL);
  const row = result.rows[0];
  if (!row) throw new Error("Services summary returned no rows.");

  return {
    detectedServices: toAggregateCount(row.detected_services),
    usersWithDetections: toAggregateCount(row.users_with_detections),
    notifications: toAggregateCount(row.notifications),
    lastDetectionAt: toIso(row.last_detection_at),
    gmailMailboxes: {
      active: toAggregateCount(row.active_mailboxes),
      error: toAggregateCount(row.error_mailboxes),
      revoked: toAggregateCount(row.revoked_mailboxes),
    },
  };
}

export async function listAdminServices(
  input: ServiceListParams,
): Promise<AdminServiceListResult> {
  const pool = getPool();
  const params: unknown[] = [];
  const search = serviceSearchClause(input.query, params);

  const countResult = await pool.query<CountRow>(
    `
      SELECT count(DISTINCT cs.service_name)::int AS total
      FROM connected_services cs
      WHERE cs.service_name <> 'other'
      ${search}
    `,
    params,
  );
  const total = toAggregateCount(countResult.rows[0]?.total);
  const { page, pageCount } = clampPage(input.page, total, SERVICE_PAGE_SIZE);
  const offset = (page - 1) * SERVICE_PAGE_SIZE;

  const listParams: unknown[] = [...params, SERVICE_PAGE_SIZE, offset];
  const listResult = await pool.query<ServiceRow>(
    `
      SELECT
        cs.service_name,
        count(*)::int AS users,
        COALESCE(sum(cs.notification_count), 0)::bigint AS notifications,
        min(cs.first_detected_at) AS first_seen_at,
        max(cs.last_detected_at) AS last_seen_at,
        count(*) FILTER (WHERE gc.connection_status = 'active')::int AS users_with_active_gmail
      FROM connected_services cs
      LEFT JOIN gmail_connections gc ON gc.user_id = cs.user_id
      WHERE cs.service_name <> 'other'
      ${search}
      GROUP BY cs.service_name
      ORDER BY ${SERVICE_ORDER[input.sort] ?? SERVICE_ORDER.users}
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
    `,
    listParams,
  );

  return {
    services: listResult.rows.map((row) => ({
      serviceName: row.service_name,
      users: toAggregateCount(row.users),
      notifications: toAggregateCount(row.notifications),
      firstSeenAt: toIso(row.first_seen_at),
      lastSeenAt: toIso(row.last_seen_at),
      usersWithActiveGmail: toAggregateCount(row.users_with_active_gmail),
    })),
    total,
    page,
    pageCount,
    pageSize: SERVICE_PAGE_SIZE,
  };
}

export async function getOtherSendersSummary(): Promise<AdminOtherSendersSummary> {
  const result = await getPool().query<OtherRow>(OTHER_SQL);
  const row = result.rows[0];
  if (!row) throw new Error("Other senders summary returned no rows.");

  return {
    users: toAggregateCount(row.users),
    notifications: toAggregateCount(row.notifications),
    firstSeenAt: toIso(row.first_seen_at),
    lastSeenAt: toIso(row.last_seen_at),
  };
}

export async function getAdminServiceDetail(
  serviceName: string,
): Promise<AdminServiceDetail | null> {
  if (!isSafeServiceName(serviceName)) return null;

  const result = await getPool().query<DetailRow>(DETAIL_SQL, [serviceName]);
  const row = result.rows[0];
  if (!row || toAggregateCount(row.users) === 0) return null;

  return {
    serviceName,
    users: toAggregateCount(row.users),
    notifications: toAggregateCount(row.notifications),
    firstSeenAt: toIso(row.first_seen_at),
    lastSeenAt: toIso(row.last_seen_at),
    usersWithActiveGmail: toAggregateCount(row.users_with_active_gmail),
  };
}

export async function listAdminServiceUsers(
  serviceName: string,
  input: ServiceUserListParams,
): Promise<AdminServiceUserListResult> {
  if (!isSafeServiceName(serviceName)) {
    return {
      users: [],
      total: 0,
      page: 1,
      pageCount: 1,
      pageSize: SERVICE_USER_PAGE_SIZE,
    };
  }

  const pool = getPool();
  const baseParams: unknown[] = [serviceName];
  const search = userSearchClause(input.query, baseParams);

  const countResult = await pool.query<CountRow>(
    `
      SELECT count(*)::int AS total
      FROM connected_services cs
      JOIN users u ON u.id = cs.user_id
      WHERE cs.service_name = $1
      ${search}
    `,
    baseParams,
  );
  const total = toAggregateCount(countResult.rows[0]?.total);
  const { page, pageCount } = clampPage(input.page, total, SERVICE_USER_PAGE_SIZE);
  const offset = (page - 1) * SERVICE_USER_PAGE_SIZE;

  const listParams: unknown[] = [...baseParams, SERVICE_USER_PAGE_SIZE, offset];
  const listResult = await pool.query<ServiceUserRow>(
    `
      SELECT
        cs.user_id,
        u.display_name,
        cs.notification_count,
        cs.first_detected_at,
        cs.last_detected_at,
        gc.connection_status,
        gc.last_sync_at
      FROM connected_services cs
      JOIN users u ON u.id = cs.user_id
      LEFT JOIN gmail_connections gc ON gc.user_id = cs.user_id
      WHERE cs.service_name = $1
      ${search}
      ORDER BY ${SERVICE_USER_ORDER[input.sort] ?? SERVICE_USER_ORDER.last_seen}
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
    `,
    listParams,
  );

  return {
    users: listResult.rows.map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? "",
      notificationCount: toAggregateCount(row.notification_count),
      firstSeenAt: toIso(row.first_detected_at),
      lastSeenAt: toIso(row.last_detected_at),
      gmailStatus: row.connection_status,
      gmailLastSyncAt: toIso(row.last_sync_at),
    })),
    total,
    page,
    pageCount,
    pageSize: SERVICE_USER_PAGE_SIZE,
  };
}
