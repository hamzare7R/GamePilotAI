import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SyncEvent } from "@/server/mail/types";

function formatDate(value: Date | null) {
  return value ? value.toLocaleString() : "Not yet";
}

export function SyncStatus({
  connection,
  events,
  configured,
}: {
  connection: {
    status: "active" | "error" | "revoked";
    lastSyncAt: Date | null;
    watchExpiration: Date | null;
  } | null;
  events: SyncEvent[];
  configured: boolean;
}) {
  const failedEvents = events.filter((event) => event.status === "failed");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synchronization status</CardTitle>
        <CardDescription>Watches are renewed daily; a safety sync covers delayed Pub/Sub deliveries.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Last successful sync</dt>
            <dd className="font-medium">{formatDate(connection?.lastSyncAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Watch expiration</dt>
            <dd className="font-medium">{formatDate(connection?.watchExpiration ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Refresh status</dt>
            <dd className="font-medium">
              {!configured ? "Not configured" : connection ? "Offline access granted" : "No connection"}
            </dd>
          </div>
        </dl>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Recent events</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sync events recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={event.status === "failed" ? "destructive" : event.status === "success" ? "success" : "outline"}>
                    {event.status}
                  </Badge>
                  <span className="font-medium">{event.eventType.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                  {event.errorCode ? <span className="text-xs text-destructive">{event.errorCode}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {failedEvents.length > 0 ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {failedEvents.length} recent event{failedEvents.length === 1 ? "" : "s"} failed. Reconnect Gmail if the
            grant was revoked.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
