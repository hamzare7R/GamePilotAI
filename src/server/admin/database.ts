import type { PoolClient, QueryResultRow } from "pg";

import {
  appendHealthCheck,
  classifyLatency,
  providerLabel,
  safeDatabaseErrorCode,
  sumDefined,
  toSafeNumber,
  topBySize,
  type DatabaseCheck,
  type HealthLevel,
} from "@/lib/admin/database-metrics";
import { getDatabaseConfig } from "@/server/db/config";
import { getPool } from "@/server/db/pool";

/**
 * Read-only monitoring of the existing database. Every statement here is a
 * SELECT against pg_catalog/stat views or aggregate counters; nothing writes.
 */

export type DatabaseAvailability = "operational" | "degraded" | "unavailable" | "not_configured";

export type DatabaseConnectionInfo = {
  status: DatabaseAvailability;
  reason: "not_configured" | "unreachable" | null;
  provider: string;
  databaseName: string | null;
  serverVersion: string | null;
  inRecovery: boolean | null;
  latencyMs: number | null;
  checkedAt: string;
  activeConnections: number | null;
  maxConnections: number | null;
  tlsEnabled: boolean | null;
};

export type DatabaseHealth = {
  status: DatabaseAvailability;
  latencyMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failedChecks: number;
  totalChecks: number;
  history: DatabaseCheck[];
  errorCode: string | null;
};

export type DatabaseTableMetric = {
  tableName: string;
  statsAvailable: boolean;
  estimatedRows: number | null;
  tableBytes: number | null;
  indexBytes: number | null;
  totalBytes: number | null;
  lastAnalyze: string | null;
  lastAutovacuum: string | null;
};

export type DatabaseTables = {
  rows: DatabaseTableMetric[];
  errorCode: string | null;
};

export type DatabaseStorage = {
  databaseBytes: number | null;
  tablesBytes: number | null;
  indexesBytes: number | null;
  topTables: DatabaseTableMetric[];
  gmailNotificationsBytes: number | null;
  gmailAttachmentsBytes: number | null;
  attachmentCount: number | null;
  attachmentContentBytes: number | null;
  attachmentSizeMismatches: number | null;
  errorCode: string | null;
};

export type DatabaseIndexMetric = {
  indexName: string;
  tableName: string;
  indexType: string;
  keyColumns: string[];
  isPrimary: boolean;
  isUnique: boolean;
  indexBytes: number | null;
  statsAvailable: boolean;
  scans: number | null;
};

export type DatabaseIndexes = {
  rows: DatabaseIndexMetric[];
  errorCode: string | null;
};

export type DatabaseStatementMetric = {
  queryId: string | null;
  calls: number | null;
  meanMs: number | null;
  totalMs: number | null;
  rows: number | null;
};

export type DatabasePerformance = {
  pgStatStatements: {
    enabled: boolean;
    available: boolean;
    reason: string | null;
    extensionVersion: string | null;
    trackedStatements: number | null;
    totalCalls: number | null;
    slowest: DatabaseStatementMetric[];
  };
};

export type DatabaseActivityEvent = {
  id: string;
  eventType: string;
  status: string;
  errorCode: string | null;
  createdAt: string;
};

export type DatabaseActivity = {
  events: DatabaseActivityEvent[];
  failedLast24h: number | null;
  activeReprocessRuns: number | null;
  syncEventsTable: boolean;
  reprocessTable: boolean;
  errorCode: string | null;
};

export type DatabaseMonitor = {
  generatedAt: string;
  connection: DatabaseConnectionInfo;
  health: DatabaseHealth;
  tables: DatabaseTables;
  storage: DatabaseStorage;
  indexes: DatabaseIndexes;
  performance: DatabasePerformance;
  activity: DatabaseActivity;
};

type QueryOutcome<T> = { ok: true; rows: T[] } | { ok: false; code: string };

type ProbeRow = {
  database_name: string;
  server_version: string;
  in_recovery: boolean;
};

type ConnectionsRow = {
  active_connections: number;
  max_connections: number;
};

type TlsRow = { ssl: boolean | null };

type TableRow = {
  table_name: string;
  has_stats: boolean;
  estimated_rows: string | number | null;
  table_bytes: string | number;
  index_bytes: string | number;
  total_bytes: string | number;
  last_analyze: Date | null;
  last_autovacuum: Date | null;
};

type IndexRow = {
  index_name: string;
  table_name: string;
  index_type: string;
  is_unique: boolean;
  is_primary: boolean;
  key_columns: string[] | null;
  index_bytes: string | number;
  has_stats: boolean;
  scans: string | number | null;
};

type DbSizeRow = { database_bytes: string | number };

type AttachmentTotalsRow = {
  attachment_count: number;
  content_bytes: string | number;
  size_mismatches: number;
};

type EventRow = {
  id: string;
  event_type: string;
  status: string;
  error_code: string | null;
  created_at: Date;
};

type StatsOverviewRow = { tracked: number; calls: string | number };
type StatsSlowRow = {
  query_id: string | null;
  calls: string | number;
  mean_exec_time: string | number | null;
  total_exec_time: string | number | null;
  rows: string | number | null;
};

const PROBE_SQL = `
  SELECT
    current_database() AS database_name,
    current_setting('server_version') AS server_version,
    pg_is_in_recovery() AS in_recovery
`;

const CONNECTIONS_SQL = `
  SELECT
    (SELECT count(*)::int FROM pg_stat_activity WHERE datname = current_database()) AS active_connections,
    current_setting('max_connections')::int AS max_connections
`;

const TLS_SQL = `
  SELECT (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl
`;

const TABLES_SQL = `
  SELECT
    c.relname AS table_name,
    (s.relid IS NOT NULL) AS has_stats,
    s.n_live_tup::bigint AS estimated_rows,
    pg_table_size(c.oid) AS table_bytes,
    pg_indexes_size(c.oid) AS index_bytes,
    pg_total_relation_size(c.oid) AS total_bytes,
    s.last_analyze,
    s.last_autovacuum
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
  ORDER BY pg_total_relation_size(c.oid) DESC, c.relname ASC
`;

const INDEXES_SQL = `
  SELECT
    ic.relname AS index_name,
    t.relname AS table_name,
    am.amname AS index_type,
    i.indisunique AS is_unique,
    EXISTS (
      SELECT 1 FROM pg_constraint con
      WHERE con.conindid = i.indexrelid AND con.contype = 'p'
    ) AS is_primary,
    ARRAY(
      SELECT pg_get_indexdef(i.indexrelid, positions.column_no, true)
      FROM generate_series(1, i.indnkeyatts) AS positions(column_no)
    ) AS key_columns,
    pg_relation_size(i.indexrelid) AS index_bytes,
    (st.indexrelid IS NOT NULL) AS has_stats,
    st.idx_scan::bigint AS scans
  FROM pg_index i
  JOIN pg_class t ON t.oid = i.indrelid
  JOIN pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  LEFT JOIN pg_stat_user_indexes st ON st.indexrelid = i.indexrelid
  WHERE n.nspname = 'public'
    AND t.relkind IN ('r', 'p')
  ORDER BY pg_relation_size(i.indexrelid) DESC, ic.relname ASC
`;

const DB_SIZE_SQL = `SELECT pg_database_size(current_database()) AS database_bytes`;

const ATTACHMENTS_SQL = `
  SELECT
    count(*)::int AS attachment_count,
    COALESCE(sum(octet_length(content)), 0)::bigint AS content_bytes,
    count(*) FILTER (WHERE octet_length(content) <> byte_size)::int AS size_mismatches
  FROM gmail_attachments
`;

const EVENTS_SQL = `
  SELECT id, event_type, status, error_code, created_at
    FROM gmail_sync_events
   ORDER BY created_at DESC
   LIMIT 8
`;

const FAILED_EVENTS_SQL = `
  SELECT count(*)::int AS failed
    FROM gmail_sync_events
   WHERE status = 'failed'
     AND created_at >= now() - interval '24 hours'
`;

const ACTIVE_RUNS_SQL = `
  SELECT count(*)::int AS active
    FROM gmail_reprocess_runs
   WHERE status IN ('running', 'paused')
`;

const STATS_EXTENSION_SQL = `
  SELECT extversion FROM pg_extension WHERE extname = 'pg_stat_statements' LIMIT 1
`;

const STATS_OVERVIEW_SQL = `
  SELECT count(*)::int AS tracked, COALESCE(sum(calls), 0)::bigint AS calls
    FROM pg_stat_statements
`;

const STATS_SLOWEST_SQL = `
  SELECT queryid::text AS query_id, calls, mean_exec_time, total_exec_time, rows
    FROM pg_stat_statements
   ORDER BY total_exec_time DESC NULLS LAST
   LIMIT 5
`;

type HistoryStore = { checks: DatabaseCheck[] };

const globalStore = globalThis as typeof globalThis & {
  __gpDatabaseHealth?: HistoryStore;
};

function recordCheck(check: DatabaseCheck) {
  const store = globalStore.__gpDatabaseHealth ?? { checks: [] };
  store.checks = appendHealthCheck(store.checks, check);
  globalStore.__gpDatabaseHealth = store;
  return store.checks;
}

function currentHistory() {
  return globalStore.__gpDatabaseHealth?.checks ?? [];
}

function notApplicable<T>(): QueryOutcome<T> {
  return { ok: true, rows: [] };
}

async function readRows<T extends QueryResultRow>(
  sql: string,
  label: string,
): Promise<QueryOutcome<T>> {
  try {
    const result = await getPool().query<T>(sql);
    return { ok: true, rows: result.rows };
  } catch (error) {
    const code = safeDatabaseErrorCode(error, "QUERY_FAILED");
    console.warn("[admin:database] query failed", { query: label, code });
    return { ok: false, code };
  }
}

const ATTACHMENT_SCAN_TIMEOUT_MS = 5_000;

async function readRowsWithTimeout<T extends QueryResultRow>(
  sql: string,
  label: string,
  timeoutMs: number,
): Promise<QueryOutcome<T>> {
  let client: PoolClient;
  try {
    client = await getPool().connect();
  } catch (error) {
    const code = safeDatabaseErrorCode(error, "CONNECTION_FAILED");
    console.warn("[admin:database] query failed", { query: label, code });
    return { ok: false, code };
  }

  let reusable = false;
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SELECT set_config('statement_timeout', $1, true)", [`${timeoutMs}ms`]);
    const result = await client.query<T>(sql);
    await client.query("ROLLBACK");
    reusable = true;
    return { ok: true, rows: result.rows };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
      reusable = true;
    } catch {
      // The connection is already unusable; release(true) discards it.
    }
    const code = safeDatabaseErrorCode(error, "QUERY_FAILED");
    console.warn("[admin:database] query failed", { query: label, code });
    return { ok: false, code };
  } finally {
    client.release(!reusable);
  }
}

function latestOf(history: readonly DatabaseCheck[], ok: boolean) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]!.ok === ok) return history[index]!.at;
  }
  return null;
}

function emptyMonitor(
  generatedAt: string,
  options: {
    status: DatabaseAvailability;
    reason: "not_configured" | "unreachable" | null;
    provider: string;
    errorCode: string | null;
    history: DatabaseCheck[];
    latencyMs: number | null;
  },
): DatabaseMonitor {
  const { status, reason, provider, errorCode, history, latencyMs } = options;

  return {
    generatedAt,
    connection: {
      status,
      reason,
      provider,
      databaseName: null,
      serverVersion: null,
      inRecovery: null,
      latencyMs,
      checkedAt: generatedAt,
      activeConnections: null,
      maxConnections: null,
      tlsEnabled: null,
    },
    health: {
      status,
      latencyMs,
      lastSuccessAt: latestOf(history, true),
      lastFailureAt: latestOf(history, false),
      failedChecks: history.filter((check) => !check.ok).length,
      totalChecks: history.length,
      history: [...history],
      errorCode,
    },
    tables: { rows: [], errorCode },
    storage: {
      databaseBytes: null,
      tablesBytes: null,
      indexesBytes: null,
      topTables: [],
      gmailNotificationsBytes: null,
      gmailAttachmentsBytes: null,
      attachmentCount: null,
      attachmentContentBytes: null,
      attachmentSizeMismatches: null,
      errorCode,
    },
    indexes: { rows: [], errorCode },
    performance: {
      pgStatStatements: {
        enabled: false,
        available: false,
        reason: status === "not_configured" ? "DATABASE_NOT_CONFIGURED" : "DATABASE_UNAVAILABLE",
        extensionVersion: null,
        trackedStatements: null,
        totalCalls: null,
        slowest: [],
      },
    },
    activity: {
      events: [],
      failedLast24h: null,
      activeReprocessRuns: null,
      syncEventsTable: false,
      reprocessTable: false,
      errorCode,
    },
  };
}

async function loadPerformance(): Promise<DatabasePerformance["pgStatStatements"]> {
  const extension = await readRows<{ extversion: string }>(
    STATS_EXTENSION_SQL,
    "pg_stat_statements_extension",
  );
  if (!extension.ok) {
    return {
      enabled: false,
      available: false,
      reason: extension.code,
      extensionVersion: null,
      trackedStatements: null,
      totalCalls: null,
      slowest: [],
    };
  }

  const version = extension.rows[0]?.extversion ?? null;
  if (!version) {
    return {
      enabled: false,
      available: false,
      reason: "NOT_ENABLED",
      extensionVersion: null,
      trackedStatements: null,
      totalCalls: null,
      slowest: [],
    };
  }

  const [overview, slowest] = await Promise.all([
    readRows<StatsOverviewRow>(STATS_OVERVIEW_SQL, "pg_stat_statements_overview"),
    readRows<StatsSlowRow>(STATS_SLOWEST_SQL, "pg_stat_statements_slowest"),
  ]);

  if (!overview.ok || !slowest.ok) {
    return {
      enabled: true,
      available: false,
      reason: overview.ok ? (slowest.ok ? null : slowest.code) : overview.code,
      extensionVersion: version,
      trackedStatements: null,
      totalCalls: null,
      slowest: [],
    };
  }

  return {
    enabled: true,
    available: true,
    reason: null,
    extensionVersion: version,
    trackedStatements: toSafeNumber(overview.rows[0]?.tracked),
    totalCalls: toSafeNumber(overview.rows[0]?.calls),
    slowest: slowest.rows.map((row) => ({
      queryId: row.query_id,
      calls: toSafeNumber(row.calls),
      meanMs: toSafeNumber(row.mean_exec_time),
      totalMs: toSafeNumber(row.total_exec_time),
      rows: toSafeNumber(row.rows),
    })),
  };
}

async function loadActivity(tableNames: Set<string>): Promise<DatabaseActivity> {
  const hasEvents = tableNames.has("gmail_sync_events");
  const hasReprocess = tableNames.has("gmail_reprocess_runs");

  if (!hasEvents) {
    return {
      events: [],
      failedLast24h: null,
      activeReprocessRuns: null,
      syncEventsTable: false,
      reprocessTable: hasReprocess,
      errorCode: null,
    };
  }

  const [events, failed, runs] = await Promise.all([
    readRows<EventRow>(EVENTS_SQL, "sync_events_recent"),
    readRows<{ failed: number }>(FAILED_EVENTS_SQL, "sync_events_failed_24h"),
    hasReprocess
      ? readRows<{ active: number }>(ACTIVE_RUNS_SQL, "reprocess_active_runs")
      : notApplicable<{ active: number }>(),
  ]);

  const errorCode = !events.ok
    ? events.code
    : !failed.ok
      ? failed.code
      : !runs.ok
        ? runs.code
        : null;

  return {
    events: events.ok
      ? events.rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          status: row.status,
          errorCode: row.error_code,
          createdAt: row.created_at.toISOString(),
        }))
      : [],
    failedLast24h: failed.ok ? toSafeNumber(failed.rows[0]?.failed) : null,
    activeReprocessRuns: runs.ok ? toSafeNumber(runs.rows[0]?.active) : null,
    syncEventsTable: true,
    reprocessTable: hasReprocess,
    errorCode,
  };
}

export async function getDatabaseMonitor(): Promise<DatabaseMonitor> {
  const generatedAt = new Date().toISOString();
  const { config } = getDatabaseConfig();

  if (!config) {
    return emptyMonitor(generatedAt, {
      status: "not_configured",
      reason: "not_configured",
      provider: "Unavailable",
      errorCode: "DATABASE_NOT_CONFIGURED",
      history: currentHistory(),
      latencyMs: null,
    });
  }

  const provider = providerLabel(config.url);
  const startedAt = Date.now();
  let probe: QueryOutcome<ProbeRow>;
  try {
    const result = await getPool().query<ProbeRow>(PROBE_SQL);
    probe = { ok: true, rows: result.rows };
  } catch (error) {
    probe = { ok: false, code: safeDatabaseErrorCode(error, "DATABASE_PROBE_FAILED") };
  }
  const latencyMs = Date.now() - startedAt;

  if (!probe.ok || !probe.rows[0]) {
    const code = probe.ok ? "DATABASE_PROBE_EMPTY" : probe.code;
    const history = recordCheck({
      at: new Date().toISOString(),
      ok: false,
      latencyMs,
      code,
    });
    console.error("[admin:database] probe failed", { code });

    return emptyMonitor(generatedAt, {
      status: "unavailable",
      reason: "unreachable",
      provider,
      errorCode: code,
      history,
      latencyMs,
    });
  }

  const meta = probe.rows[0];
  const status: HealthLevel = classifyLatency(latencyMs);
  const history = recordCheck({
    at: new Date().toISOString(),
    ok: true,
    latencyMs,
    code: null,
  });

  const [tablesOutcome, indexOutcome, dbSizeOutcome, connectionsOutcome, tlsOutcome, pgStats] =
    await Promise.all([
      readRows<TableRow>(TABLES_SQL, "tables"),
      readRows<IndexRow>(INDEXES_SQL, "indexes"),
      readRows<DbSizeRow>(DB_SIZE_SQL, "database_size"),
      readRows<ConnectionsRow>(CONNECTIONS_SQL, "connections"),
      readRows<TlsRow>(TLS_SQL, "tls"),
      loadPerformance(),
    ]);

  const tables = tablesOutcome.ok
    ? tablesOutcome.rows.map<DatabaseTableMetric>((row) => ({
        tableName: row.table_name,
        statsAvailable: row.has_stats && row.estimated_rows !== null,
        estimatedRows: toSafeNumber(row.estimated_rows),
        tableBytes: toSafeNumber(row.table_bytes),
        indexBytes: toSafeNumber(row.index_bytes),
        totalBytes: toSafeNumber(row.total_bytes),
        lastAnalyze: row.last_analyze?.toISOString() ?? null,
        lastAutovacuum: row.last_autovacuum?.toISOString() ?? null,
      }))
    : [];

  const tableNames = new Set(tables.map((table) => table.tableName));
  const [attachmentsOutcome, activity] = await Promise.all([
    tableNames.has("gmail_attachments")
      ? readRowsWithTimeout<AttachmentTotalsRow>(
          ATTACHMENTS_SQL,
          "attachments_totals",
          ATTACHMENT_SCAN_TIMEOUT_MS,
        )
      : notApplicable<AttachmentTotalsRow>(),
    loadActivity(tableNames),
  ]);

  const attachmentTotals = attachmentsOutcome.ok ? attachmentsOutcome.rows[0] : undefined;
  const gmailNotifications = tables.find((table) => table.tableName === "gmail_notifications");
  const gmailAttachments = tables.find((table) => table.tableName === "gmail_attachments");

  const storageErrorCode = !tablesOutcome.ok
    ? tablesOutcome.code
    : !dbSizeOutcome.ok
      ? dbSizeOutcome.code
      : tableNames.has("gmail_attachments") && !attachmentsOutcome.ok
        ? attachmentsOutcome.code
        : null;

  const indexes = indexOutcome.ok
    ? indexOutcome.rows.map<DatabaseIndexMetric>((row) => ({
        indexName: row.index_name,
        tableName: row.table_name,
        indexType: row.index_type,
        keyColumns: row.key_columns ?? [],
        isPrimary: row.is_primary,
        isUnique: row.is_unique,
        indexBytes: toSafeNumber(row.index_bytes),
        statsAvailable: row.has_stats && row.scans !== null,
        scans: toSafeNumber(row.scans),
      }))
    : [];

  return {
    generatedAt,
    connection: {
      status,
      reason: null,
      provider,
      databaseName: meta.database_name,
      serverVersion: meta.server_version,
      inRecovery: meta.in_recovery,
      latencyMs,
      checkedAt: generatedAt,
      activeConnections: connectionsOutcome.ok
        ? toSafeNumber(connectionsOutcome.rows[0]?.active_connections)
        : null,
      maxConnections: connectionsOutcome.ok
        ? toSafeNumber(connectionsOutcome.rows[0]?.max_connections)
        : null,
      tlsEnabled: tlsOutcome.ok ? (tlsOutcome.rows[0]?.ssl ?? null) : null,
    },
    health: {
      status,
      latencyMs,
      lastSuccessAt: latestOf(history, true),
      lastFailureAt: latestOf(history, false),
      failedChecks: history.filter((check) => !check.ok).length,
      totalChecks: history.length,
      history: [...history],
      errorCode: null,
    },
    tables: { rows: tables, errorCode: tablesOutcome.ok ? null : tablesOutcome.code },
    storage: {
      databaseBytes: dbSizeOutcome.ok ? toSafeNumber(dbSizeOutcome.rows[0]?.database_bytes) : null,
      tablesBytes: sumDefined(tables.map((table) => table.tableBytes)),
      indexesBytes: sumDefined(tables.map((table) => table.indexBytes)),
      topTables: topBySize(tables, (table) => table.totalBytes, 5),
      gmailNotificationsBytes: gmailNotifications?.totalBytes ?? null,
      gmailAttachmentsBytes: gmailAttachments?.totalBytes ?? null,
      attachmentCount: attachmentTotals ? toSafeNumber(attachmentTotals.attachment_count) : null,
      attachmentContentBytes: attachmentTotals
        ? toSafeNumber(attachmentTotals.content_bytes)
        : null,
      attachmentSizeMismatches: attachmentTotals
        ? toSafeNumber(attachmentTotals.size_mismatches)
        : null,
      errorCode: storageErrorCode,
    },
    indexes: { rows: indexes, errorCode: indexOutcome.ok ? null : indexOutcome.code },
    performance: { pgStatStatements: pgStats },
    activity,
  };
}
