import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  HardDrive,
  Mail,
  Paperclip,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";

import { QuickAccess } from "@/components/admin/overview/quick-access";
import { RecentActivity } from "@/components/admin/overview/recent-activity";
import { SystemHealth } from "@/components/admin/overview/system-health";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAdminOverview } from "@/server/admin/overview";
import { requireAdminPage } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export default async function AdminOverviewPage() {
  await requireAdminPage();
  const overview = await getAdminOverview();
  const { metrics, databaseStatus } = overview;

  const storageTotal =
    metrics.attachmentBytes !== null && metrics.messageTextBytes !== null
      ? metrics.attachmentBytes + metrics.messageTextBytes
      : null;

  const storageHint =
    metrics.attachmentBytes === null || metrics.messageTextBytes === null
      ? "Unavailable"
      : `${formatBytes(metrics.attachmentBytes)} attachments + ${formatBytes(metrics.messageTextBytes)} text`;

  const stats = [
    {
      label: "Total users",
      value: formatCount(metrics.totalUsers),
      hint: metrics.totalUsers === null ? "Unavailable" : "Registered accounts",
      icon: Users,
      accent: "purple" as const,
    },
    {
      label: "Active users",
      value: formatCount(metrics.activeUsers),
      hint: metrics.activeUsers === null ? "Unavailable" : "Sessions valid right now",
      icon: UserCheck,
      accent: "blue" as const,
    },
    {
      label: "Gmail connections",
      value: formatCount(metrics.gmailConnections),
      hint:
        metrics.activeGmailConnections === null
          ? "Unavailable"
          : `${formatCount(metrics.activeGmailConnections)} active`,
      icon: Mail,
      accent: "purple" as const,
    },
    {
      label: "Total notifications",
      value: formatCount(metrics.totalNotifications),
      hint: metrics.totalNotifications === null ? "Unavailable" : "Stored message alerts",
      icon: Bell,
      accent: "blue" as const,
    },
    {
      label: "Total attachments",
      value: formatCount(metrics.totalAttachments),
      hint: metrics.totalAttachments === null ? "Unavailable" : "Files retained in Neon",
      icon: Paperclip,
      accent: "purple" as const,
    },
    {
      label: "Storage usage",
      value: formatBytes(storageTotal),
      hint: storageHint,
      icon: HardDrive,
      accent: "blue" as const,
    },
  ];

  const aggregatesFailed = databaseStatus === "operational" && metrics.totalUsers === null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner console"
        title="Overview"
        description="A live operational view of GamePilotAI. Every figure is read from the production Neon database — nothing is estimated."
        actions={
          <>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Live data
            </Badge>
            <Button asChild variant="secondary">
              <Link href="/admin">
                <RefreshCw aria-hidden="true" />
                Refresh
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/mail-monitor">
                <Mail aria-hidden="true" />
                Mail Monitor
              </Link>
            </Button>
          </>
        }
      />

      {databaseStatus !== "operational" ? (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4 text-sm",
            databaseStatus === "not_configured"
              ? "border-amber-400/30 bg-amber-400/5 text-amber-200"
              : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">
              {databaseStatus === "not_configured"
                ? "No database is configured on this deployment."
                : "Live database metrics are unavailable."}
            </p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              {databaseStatus === "not_configured"
                ? "Set DATABASE_URL (or POSTGRES_URL) to load real metrics. Unavailable values are shown as — instead of being invented."
                : "Neon could not be reached. Nothing was changed; values stay unavailable until the next successful probe."}
            </p>
          </div>
        </div>
      ) : null}

      {aggregatesFailed ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">The database is online, but the aggregate queries failed.</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              Counts remain unavailable rather than estimated. Check the server logs for the
              failure code.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SystemHealth overview={overview} />
        <RecentActivity events={overview.activity} databaseReachable={databaseStatus === "operational"} />
      </div>

      <QuickAccess />

      <p className="text-xs text-muted-foreground">
        Snapshot generated{" "}
        {new Date(overview.generatedAt).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        })}{" "}
        UTC · counts refresh on every request.
      </p>
    </div>
  );
}
