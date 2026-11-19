import { Activity, AlertTriangle, Database, Gauge, HardDrive, Layers, ListTree, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { shareOf } from "@/lib/admin/database-metrics";
import { formatBytes, formatCount, formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DatabaseAvailability, DatabaseMonitor } from "@/server/admin/database";

type BadgeVariant = "default" | "secondary" | "outline" | "blue" | "success" | "destructive";

const STATUS_PRESENTATION: Record<
  DatabaseAvailability,
  { label: string; variant: BadgeVariant }
> = {
  operational: { label: "Operational", variant: "success" },
  degraded: { label: "Degraded", variant: "secondary" },
  unavailable: { label: "Unavailable", variant: "destructive" },
  not_configured: { label: "Not configured", variant: "outline" },
};

export function DatabaseStatusBadge({ status }: { status: DatabaseAvailability }) {
  const presentation = STATUS_PRESENTATION[status];
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-base font-semibold" title={value}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionAlert({ title, code }: { title: string; code: string | null }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-200"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {title}
        {code ? <span className="ml-1 font-mono opacity-80">({code})</span> : null}
      </span>
    </p>
  );
}

function formatMs(value: number | null) {
  if (value === null) return "—";
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ms`;
}

function statDate(iso: string | null, available: boolean) {
  if (!available) return "Unavailable";
  return iso ? formatDateTime(iso) : "Never";
}

function statCount(value: number | null, available: boolean) {
  if (!available) return "Unavailable";
  return formatCount(value);
}

const UNAVAILABLE_HINT =
  "PostgreSQL returned no statistics row for this object to the current database role.";

const TABLE_HEAD = "border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase";
const TABLE_CELL = "px-4 py-3";

export function DatabaseHealthPanel({ monitor }: { monitor: DatabaseMonitor }) {
  const { connection, health } = monitor;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-primary" aria-hidden="true" />
          Connection health
        </CardTitle>
        <CardDescription>
          Live probe executed by this server instance. The connection string, host and credentials
          are never rendered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Fact
            label="Provider"
            value={connection.provider}
            hint="Detected from the configured URL; the URL itself stays server-side."
          />
          <Fact
            label="Database"
            value={connection.databaseName ?? "—"}
            hint={
              connection.inRecovery === null
                ? "Unavailable"
                : connection.inRecovery
                  ? "Read replica endpoint"
                  : "Primary endpoint"
            }
          />
          <Fact label="Server version" value={connection.serverVersion ?? "—"} hint="PostgreSQL server version" />
          <Fact
            label="Probe latency"
            value={connection.latencyMs !== null ? `${connection.latencyMs} ms` : "—"}
            hint={connection.status === "degraded" ? "Above the 1000 ms threshold" : "Last round trip"}
          />
          <Fact
            label="Active connections"
            value={
              connection.activeConnections !== null && connection.maxConnections !== null
                ? `${formatCount(connection.activeConnections)} / ${formatCount(connection.maxConnections)}`
                : "—"
            }
            hint="pg_stat_activity for this database"
          />
          <Fact
            label="TLS on this session"
            value={connection.tlsEnabled === null ? "—" : connection.tlsEnabled ? "Enabled" : "Disabled"}
            hint="pg_stat_ssl for the current backend"
          />
          <Fact
            label="Last successful probe"
            value={health.lastSuccessAt ? formatRelativeTime(health.lastSuccessAt) : "None recorded"}
            hint={health.lastSuccessAt ? formatDateTime(health.lastSuccessAt) : "No success in this instance"}
          />
          <Fact
            label="Failed probes (instance)"
            value={`${formatCount(health.failedChecks)} / ${formatCount(health.totalChecks)}`}
            hint="In-memory counter; resets when the server restarts"
          />
        </dl>

        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Recent checks · this instance
          </p>
          {health.history.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No probe has been recorded yet.</p>
          ) : (
            <ol className="mt-2 flex flex-wrap gap-1.5">
              {health.history.map((check, index) => (
                <li
                  key={`${check.at}-${index}`}
                  title={`${formatDateTime(check.at)} · ${check.latencyMs ?? "—"} ms${
                    check.code ? ` · ${check.code}` : ""
                  }`}
                  className={cn(
                    "min-w-9 rounded border px-1.5 py-0.5 text-center font-mono text-[10px]",
                    check.ok
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                >
                  {check.latencyMs !== null ? check.latencyMs : "—"}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Health history lives in process memory only: no history table exists and none is created.
            Each cell shows the probe latency in milliseconds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DatabaseStoragePanel({ monitor }: { monitor: DatabaseMonitor }) {
  const { storage } = monitor;
  const denominator = storage.databaseBytes ?? storage.tablesBytes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="size-4 text-primary" aria-hidden="true" />
          Storage footprint
        </CardTitle>
        <CardDescription>
          Sizes reported by the database catalogs and exact aggregate sums for stored attachments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {storage.errorCode ? (
          <SectionAlert title="Some storage figures could not be read." code={storage.errorCode} />
        ) : null}

        <dl className="grid gap-2 sm:grid-cols-2">
          <Fact label="Database size" value={formatBytes(storage.databaseBytes)} hint="pg_database_size(current_database())" />
          <Fact label="Tables" value={formatBytes(storage.tablesBytes)} hint="Sum of pg_table_size across public" />
          <Fact label="Indexes" value={formatBytes(storage.indexesBytes)} hint="Sum of pg_indexes_size across public" />
          <Fact
            label="Gmail messages"
            value={formatBytes(storage.gmailNotificationsBytes)}
            hint="gmail_notifications table, indexes included"
          />
          <Fact
            label="Gmail attachments"
            value={formatBytes(storage.gmailAttachmentsBytes)}
            hint="gmail_attachments table, indexes included"
          />
          <Fact
            label="Attachment payload"
            value={formatBytes(storage.attachmentContentBytes)}
            hint={
              storage.attachmentCount !== null
                ? `${formatCount(storage.attachmentCount)} rows · exact octet_length(content) · 5s scan limit`
                : "Attachment table not found"
            }
          />
        </dl>

        {storage.attachmentSizeMismatches ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
            {formatCount(storage.attachmentSizeMismatches)} attachment row(s) have a recorded
            byte_size that differs from octet_length(content). The payload total above uses the stored
            bytes, never the recorded size.
          </p>
        ) : null}

        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Top 5 tables by total size
          </p>
          {storage.topTables.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No user tables were found in schema public.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {storage.topTables.map((table) => {
                const share = shareOf(table.totalBytes, denominator) ?? 0;
                return (
                  <li key={table.tableName} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="truncate font-mono">{table.tableName}</span>
                      <span className="shrink-0 text-muted-foreground">{formatBytes(table.totalBytes)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-brand"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Table and index totals come from catalog size functions. The attachment payload figure is an
          exact sum over the stored BYTEA column, not an estimate; the scan is cancelled after 5
          seconds inside a read-only transaction, without changing any persistent connection setting.
        </p>
      </CardContent>
    </Card>
  );
}

export function DatabaseTablesPanel({ monitor }: { monitor: DatabaseMonitor }) {
  const { tables } = monitor;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-primary" aria-hidden="true" />
          Tables in schema public
        </CardTitle>
        <CardDescription>
          {tables.errorCode
            ? "The table catalog could not be read."
            : `${formatCount(tables.rows.length)} table(s), sorted by total size. Figures are read live.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tables.errorCode ? (
          <SectionAlert title="Table metrics are unavailable." code={tables.errorCode} />
        ) : null}

        {tables.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/30 px-6 py-8 text-center text-sm text-muted-foreground">
            No user tables were found in schema public.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card/30">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <caption className="sr-only">Tables in the public schema with estimated rows and storage</caption>
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-3 font-semibold">Table</th>
                  <th className="px-4 py-3 text-right font-semibold">Est. rows</th>
                  <th className="px-4 py-3 text-right font-semibold">Table size</th>
                  <th className="px-4 py-3 text-right font-semibold">Index size</th>
                  <th className="px-4 py-3 text-right font-semibold">Total size</th>
                  <th className="px-4 py-3 font-semibold">Last analyze</th>
                  <th className="px-4 py-3 font-semibold">Last autovacuum</th>
                </tr>
              </thead>
              <tbody>
                {tables.rows.map((table) => (
                  <tr key={table.tableName} className="border-b border-border/50 last:border-0">
                    <td className={cn(TABLE_CELL, "font-mono text-xs")}>{table.tableName}</td>
                    <td
                      className={cn(TABLE_CELL, "text-right font-mono text-xs")}
                      title={table.statsAvailable ? "Estimate from pg_stat_user_tables" : UNAVAILABLE_HINT}
                    >
                      {statCount(table.estimatedRows, table.statsAvailable)}
                    </td>
                    <td className={cn(TABLE_CELL, "text-right text-xs text-muted-foreground")}>
                      {formatBytes(table.tableBytes)}
                    </td>
                    <td className={cn(TABLE_CELL, "text-right text-xs text-muted-foreground")}>
                      {formatBytes(table.indexBytes)}
                    </td>
                    <td className={cn(TABLE_CELL, "text-right text-xs")}>{formatBytes(table.totalBytes)}</td>
                    <td
                      className={cn(TABLE_CELL, "whitespace-nowrap text-xs text-muted-foreground")}
                      title={table.statsAvailable ? undefined : UNAVAILABLE_HINT}
                    >
                      {statDate(table.lastAnalyze, table.statsAvailable)}
                    </td>
                    <td
                      className={cn(TABLE_CELL, "whitespace-nowrap text-xs text-muted-foreground")}
                      title={table.statsAvailable ? undefined : UNAVAILABLE_HINT}
                    >
                      {statDate(table.lastAutovacuum, table.statsAvailable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Row counts are estimates from pg_stat_user_tables and can lag or reset; they are not exact
          counts. &quot;Unavailable&quot; means no statistics row is visible to the current database
          role, while &quot;Never&quot; is a genuine absence of a recorded analyze or autovacuum. Sizes
          include TOAST storage where applicable.
        </p>
      </CardContent>
    </Card>
  );
}

export function DatabaseIndexesPanel({ monitor }: { monitor: DatabaseMonitor }) {
  const { indexes } = monitor;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTree className="size-4 text-primary" aria-hidden="true" />
          Indexes
        </CardTitle>
        <CardDescription>
          {indexes.errorCode
            ? "The index catalog could not be read."
            : `${formatCount(indexes.rows.length)} index(es) across schema public.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {indexes.errorCode ? (
          <SectionAlert title="Index metrics are unavailable." code={indexes.errorCode} />
        ) : null}

        {indexes.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/30 px-6 py-8 text-center text-sm text-muted-foreground">
            No indexes were found for user tables.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card/30">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <caption className="sr-only">Indexes on user tables with type, columns and scan counts</caption>
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-3 font-semibold">Index</th>
                  <th className="px-4 py-3 font-semibold">Table</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Key columns</th>
                  <th className="px-4 py-3 font-semibold">Kind</th>
                  <th className="px-4 py-3 text-right font-semibold">Size</th>
                  <th className="px-4 py-3 text-right font-semibold">Scans</th>
                </tr>
              </thead>
              <tbody>
                {indexes.rows.map((index) => (
                  <tr key={index.indexName} className="border-b border-border/50 last:border-0">
                    <td className={cn(TABLE_CELL, "max-w-[240px] truncate font-mono text-xs")} title={index.indexName}>
                      {index.indexName}
                    </td>
                    <td className={cn(TABLE_CELL, "font-mono text-xs text-muted-foreground")}>
                      {index.tableName}
                    </td>
                    <td className={cn(TABLE_CELL, "text-xs text-muted-foreground")}>{index.indexType}</td>
                    <td className={cn(TABLE_CELL, "max-w-[320px] font-mono text-[11px] break-words")}>
                      {index.keyColumns.length > 0 ? index.keyColumns.join(", ") : "—"}
                    </td>
                    <td className={TABLE_CELL}>
                      {index.isPrimary ? (
                        <Badge variant="default">Primary</Badge>
                      ) : index.isUnique ? (
                        <Badge variant="outline">Unique</Badge>
                      ) : (
                        <Badge variant="secondary">Index</Badge>
                      )}
                    </td>
                    <td className={cn(TABLE_CELL, "text-right text-xs")}>{formatBytes(index.indexBytes)}</td>
                    <td
                      className={cn(TABLE_CELL, "text-right font-mono text-xs")}
                      title={index.statsAvailable ? "Cumulative scans since the last statistics reset" : UNAVAILABLE_HINT}
                    >
                      {statCount(index.scans, index.statsAvailable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Scan counts are cumulative since the last statistics reset and are not refreshed in real
          time. A recorded zero means no scans were counted; &quot;Unavailable&quot; means no statistics
          row is visible to the current database role and is never shown as zero. Low usage is shown
          for context only; this UI never drops or alters an index.
        </p>
      </CardContent>
    </Card>
  );
}

function statsReason(reason: string | null) {
  switch (reason) {
    case null:
      return "Available";
    case "NOT_ENABLED":
      return "Extension not enabled";
    case "PERMISSION_DENIED":
      return "Insufficient privileges";
    case "DATABASE_UNAVAILABLE":
      return "Database unavailable";
    case "DATABASE_NOT_CONFIGURED":
      return "Database not configured";
    default:
      return reason;
  }
}

export function DatabasePerformancePanel({ monitor }: { monitor: DatabaseMonitor }) {
  const stats = monitor.performance.pgStatStatements;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="size-4 text-primary" aria-hidden="true" />
          Performance signals
        </CardTitle>
        <CardDescription>
          Round-trip latency and aggregate pg_stat_statements timings. SQL text is never selected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 sm:grid-cols-3">
          <Fact
            label="Probe latency"
            value={monitor.connection.latencyMs !== null ? `${monitor.connection.latencyMs} ms` : "—"}
            hint="Simple SELECT round trip"
          />
          <Fact
            label="pg_stat_statements"
            value={stats.enabled ? (stats.available ? "Available" : "Unavailable") : "Not enabled"}
            hint={stats.extensionVersion ? `Extension ${stats.extensionVersion}` : statsReason(stats.reason)}
          />
          <Fact
            label="Tracked statements"
            value={formatCount(stats.trackedStatements)}
            hint={
              stats.totalCalls !== null
                ? `${formatCount(stats.totalCalls)} calls recorded`
                : "Counts unavailable"
            }
          />
        </dl>

        {!stats.enabled ? (
          <p className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            pg_stat_statements is not enabled on this database, so statement timings are unavailable.
            Nothing is guessed or backfilled.
          </p>
        ) : !stats.available ? (
          <SectionAlert title="Statement statistics could not be read." code={stats.reason} />
        ) : stats.slowest.length === 0 ? (
          <p className="text-xs text-muted-foreground">No statements have been recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card/30">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="sr-only">Slowest statements by total execution time, without SQL text</caption>
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-3 font-semibold">Query ID</th>
                  <th className="px-4 py-3 text-right font-semibold">Calls</th>
                  <th className="px-4 py-3 text-right font-semibold">Mean</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Rows</th>
                </tr>
              </thead>
              <tbody>
                {stats.slowest.map((statement, index) => (
                  <tr key={`${statement.queryId ?? "unknown"}-${index}`} className="border-b border-border/50 last:border-0">
                    <td className={cn(TABLE_CELL, "font-mono text-xs text-muted-foreground")}>
                      {statement.queryId ?? "—"}
                    </td>
                    <td className={cn(TABLE_CELL, "text-right font-mono text-xs")}>
                      {formatCount(statement.calls)}
                    </td>
                    <td className={cn(TABLE_CELL, "text-right text-xs")}>{formatMs(statement.meanMs)}</td>
                    <td className={cn(TABLE_CELL, "text-right text-xs")}>{formatMs(statement.totalMs)}</td>
                    <td className={cn(TABLE_CELL, "text-right font-mono text-xs")}>
                      {formatCount(statement.rows)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Query text and bind parameters are intentionally excluded, so message content and personal
          data never reach this page. Stats visibility can depend on the database role privileges.
        </p>
      </CardContent>
    </Card>
  );
}

function eventVariant(status: string): BadgeVariant {
  if (status === "success") return "success";
  if (status === "failed") return "destructive";
  if (status === "skipped") return "outline";
  return "secondary";
}

export function DatabaseActivityPanel({ monitor }: { monitor: DatabaseMonitor }) {
  const { activity } = monitor;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-4 text-primary" aria-hidden="true" />
          Database activity
        </CardTitle>
        <CardDescription>
          Gmail sync events stored in the database. Only safe diagnostic fields are read.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 sm:grid-cols-3">
          <Fact
            label="Failed sync events (24h)"
            value={activity.failedLast24h !== null ? formatCount(activity.failedLast24h) : "—"}
            hint="From gmail_sync_events"
          />
          <Fact
            label="Active reprocess runs"
            value={activity.activeReprocessRuns !== null ? formatCount(activity.activeReprocessRuns) : "—"}
            hint={activity.reprocessTable ? "Running or paused" : "Table not found"}
          />
          <Fact
            label="Recent events"
            value={formatCount(activity.events.length)}
            hint="Latest 8 rows, no message content"
          />
        </dl>

        {activity.errorCode ? (
          <SectionAlert title="Some activity figures could not be read." code={activity.errorCode} />
        ) : null}

        {!activity.syncEventsTable ? (
          <p className="rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            gmail_sync_events was not found in schema public, so there are no sync events to show.
          </p>
        ) : activity.events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sync events have been recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70 bg-card/30">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="sr-only">Most recent Gmail sync events</caption>
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Error code</th>
                  <th className="px-4 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {activity.events.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 last:border-0">
                    <td className={cn(TABLE_CELL, "font-mono text-xs")}>{event.eventType}</td>
                    <td className={TABLE_CELL}>
                      <Badge variant={eventVariant(event.status)}>{event.status}</Badge>
                    </td>
                    <td className={cn(TABLE_CELL, "font-mono text-xs text-muted-foreground")}>
                      {event.errorCode ?? "—"}
                    </td>
                    <td className={cn(TABLE_CELL, "whitespace-nowrap text-xs text-muted-foreground")}>
                      <span title={formatDateTime(event.createdAt)}>
                        {formatRelativeTime(event.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2">
          <Layers className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            No persistent database error log table exists in this schema. Connection failures are
            counted by the in-memory probe history above; application errors stay in server logs and
            are not written to the database.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
