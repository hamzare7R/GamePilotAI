import { Clock, Database, HardDrive, MailCheck, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatCount, formatRelativeTime } from "@/lib/format";
import type { AdminOverview } from "@/server/admin/overview";

type HealthProps = {
  overview: AdminOverview;
};

type HealthRowProps = {
  icon: LucideIcon;
  label: string;
  detail: string;
  badge: { label: string; variant: "default" | "secondary" | "outline" | "blue" | "success" | "destructive" };
};

function HealthRow({ icon: Icon, label, detail, badge }: HealthRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
      <Badge variant={badge.variant} className="mt-0.5 shrink-0">
        {badge.label}
      </Badge>
    </div>
  );
}

export function SystemHealth({ overview }: HealthProps) {
  const { health, metrics, databaseStatus } = overview;

  const databaseBadge =
    databaseStatus === "operational"
      ? { label: "Operational", variant: "success" as const }
      : databaseStatus === "not_configured"
        ? { label: "Not configured", variant: "outline" as const }
        : { label: "Unreachable", variant: "destructive" as const };

  const databaseDetail =
    health.latencyMs !== null
      ? `${health.latencyMs} ms round trip on the last probe.`
      : databaseStatus === "not_configured"
        ? "Set DATABASE_URL to enable live metrics."
        : "The last connection attempt failed. Check the server logs.";

  const watches = health.activeWatches;
  const watchBadge =
    watches === null
      ? { label: "Unavailable", variant: "outline" as const }
      : watches > 0
        ? { label: `${formatCount(watches)} active`, variant: "success" as const }
        : { label: "None active", variant: "outline" as const };

  const storageTotal =
    metrics.attachmentBytes !== null && metrics.messageTextBytes !== null
      ? metrics.attachmentBytes + metrics.messageTextBytes
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>System health</CardTitle>
        <CardDescription>Live checks against the production database and mail integration.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border/50">
        <HealthRow
          icon={Database}
          label="Neon PostgreSQL"
          detail={databaseDetail}
          badge={databaseBadge}
        />
        <HealthRow
          icon={MailCheck}
          label="Gmail integration"
          detail="OAuth credentials, Pub/Sub settings and the token encryption key are validated on read."
          badge={
            health.gmailConfigured
              ? { label: "Configured", variant: "success" }
              : { label: "Not configured", variant: "outline" }
          }
        />
        <HealthRow
          icon={Radio}
          label="Mailbox watches"
          detail="Active Gmail watches keep push notifications flowing for connected accounts."
          badge={watchBadge}
        />
        <HealthRow
          icon={HardDrive}
          label="Stored content"
          detail={
            metrics.totalNotifications === null
              ? "Storage metrics are unavailable."
              : `${formatCount(metrics.totalNotifications)} messages · ${formatCount(metrics.totalAttachments)} attachments · ${formatBytes(storageTotal)} retained`
          }
          badge={{ label: formatBytes(storageTotal), variant: "outline" }}
        />
        <HealthRow
          icon={Clock}
          label="Last mailbox sync"
          detail={
            health.lastSyncAt
              ? `${formatRelativeTime(health.lastSyncAt)} · ${new Date(health.lastSyncAt).toLocaleString("en-US")}`
              : "No sync has been recorded for any connection."
          }
          badge={
            health.lastSyncAt
              ? { label: "Synced", variant: "success" }
              : { label: "No sync yet", variant: "outline" }
          }
        />
      </CardContent>
    </Card>
  );
}
