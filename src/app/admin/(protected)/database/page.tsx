import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Cable, Database, Server, Timer } from "lucide-react";

import {
  DatabaseActivityPanel,
  DatabaseHealthPanel,
  DatabaseIndexesPanel,
  DatabasePerformancePanel,
  DatabaseStatusBadge,
  DatabaseStoragePanel,
  DatabaseTablesPanel,
} from "@/components/admin/database/database-panels";
import { DatabaseRefreshButton } from "@/components/admin/database/refresh-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { getDatabaseMonitor, type DatabaseAvailability } from "@/server/admin/database";
import { requireAdminPage } from "@/server/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Database Monitor",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<DatabaseAvailability, string> = {
  operational: "Operational",
  degraded: "Degraded",
  unavailable: "Unavailable",
  not_configured: "Not configured",
};

export default async function AdminDatabasePage() {
  await requireAdminPage();
  const monitor = await getDatabaseMonitor();
  const { connection, health } = monitor;

  const activeConnectionsHint =
    connection.activeConnections !== null && connection.maxConnections !== null
      ? `${formatCount(connection.activeConnections)} active of ${formatCount(connection.maxConnections)} allowed`
      : "Connection counts unavailable";

  const stats = [
    {
      label: "Connection",
      value: STATUS_LABEL[connection.status],
      hint: connection.provider,
      icon: Database,
      accent: "purple" as const,
    },
    {
      label: "Response time",
      value: connection.latencyMs !== null ? `${connection.latencyMs} ms` : "—",
      hint:
        connection.status === "degraded"
          ? "Above the 1 s threshold"
          : "Latest probe round trip",
      icon: Timer,
      accent: "blue" as const,
    },
    {
      label: "Database",
      value: connection.databaseName ?? "—",
      hint: activeConnectionsHint,
      icon: Cable,
      accent: "purple" as const,
    },
    {
      label: "Server version",
      value: connection.serverVersion ?? "—",
      hint:
        connection.inRecovery === null
          ? "Replica state unavailable"
          : connection.inRecovery
            ? "Read replica endpoint"
            : "Primary endpoint",
      icon: Server,
      accent: "blue" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner console"
        title="Database Monitor"
        description="Read-only telemetry from the live Neon PostgreSQL database: connection health, table and index footprint, aggregate performance and stored Gmail sync activity. No query writes, and no connection string is rendered."
        actions={
          <>
            <DatabaseStatusBadge status={connection.status} />
            <DatabaseRefreshButton />
            <Button asChild variant="ghost">
              <Link href="/admin">Overview</Link>
            </Button>
          </>
        }
      />

      {connection.status === "not_configured" ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">No database is configured on this deployment.</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              Set DATABASE_URL (or POSTGRES_URL) to load live database telemetry. Nothing on this page
              is estimated or invented while the connection is missing.
            </p>
          </div>
        </div>
      ) : connection.status === "unavailable" ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">The database probe failed.</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              Nothing was changed. The monitor stays read-only and retries on refresh.
              {health.errorCode ? (
                <span className="ml-1 font-mono">({health.errorCode})</span>
              ) : null}
            </p>
          </div>
        </div>
      ) : connection.status === "degraded" ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">
              The database answered, but the probe took {connection.latencyMs ?? 0} ms.
            </p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              Every figure below is still read live. Slow probes can come from cold starts or network
              distance to the database region.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <DatabaseHealthPanel monitor={monitor} />
        <DatabaseStoragePanel monitor={monitor} />
      </div>

      <DatabaseTablesPanel monitor={monitor} />
      <DatabaseIndexesPanel monitor={monitor} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <DatabasePerformancePanel monitor={monitor} />
        <DatabaseActivityPanel monitor={monitor} />
      </div>

      <p className="text-xs text-muted-foreground">
        Snapshot generated{" "}
        {new Date(monitor.generatedAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        })}{" "}
        UTC · SELECT-only queries against pg_catalog and aggregate tables · credentials are never
        rendered.
      </p>
    </div>
  );
}
