import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_LABELS, type ServiceKey } from "@/lib/gmail/service-map";
import { requireAdminPage } from "@/server/auth/admin";
import { getAdminMailSummary } from "@/server/mail/repository";
import type { AdminMailSummary } from "@/server/mail/types";

export const metadata = { title: "Mail Monitor health" };

function labelFor(serviceName: string) {
  return SERVICE_LABELS[serviceName as ServiceKey] ?? "Other services";
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

export default async function AdminMailMonitorPage() {
  await requireAdminPage();

  let summary: AdminMailSummary | null = null;
  try {
    summary = await getAdminMailSummary();
  } catch {
    summary = null;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Owner area · system health</p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mail Monitor</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Aggregate operational metrics only. Message contents, sender addresses and verification codes are never
          exposed here.
        </p>
      </header>

      {!summary ? (
        <Card>
          <CardContent className="flex items-start gap-3 px-6 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-medium">Metrics are temporarily unavailable.</p>
              <p className="mt-1 text-muted-foreground">
                The database could not be reached, or the mail tables have not been created yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Gmail connections" value={summary.totalConnections} />
            <Metric label="Active connections" value={summary.activeConnections} />
            <Metric label="Disconnected / errored" value={summary.disconnectedAccounts} />
            <Metric label="Pub/Sub events" value={summary.pubsubEvents} />
            <Metric label="Successful syncs" value={summary.successfulSyncs} />
            <Metric label="Failed syncs" value={summary.failedSyncs} />
            <Metric
              label="Last system activity"
              value={summary.lastActivity ? summary.lastActivity.toLocaleString() : "None yet"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Connected services</CardTitle>
              <CardDescription>Detection counts across all accounts, without identifying any user.</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.serviceCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No detections yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                        <th className="pb-2 pr-3 font-semibold">Service</th>
                        <th className="pb-2 pr-3 font-semibold">Accounts</th>
                        <th className="pb-2 font-semibold">Notifications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.serviceCounts.map((entry) => (
                        <tr key={entry.serviceName} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 pr-3 font-medium">{labelFor(entry.serviceName)}</td>
                          <td className="py-2.5 pr-3">
                            <Badge variant="outline">{entry.connections}</Badge>
                          </td>
                          <td className="py-2.5 text-muted-foreground">{entry.notifications}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
