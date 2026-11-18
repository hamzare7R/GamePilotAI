import { AlertTriangle, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import type { AdminActivityEvent } from "@/server/admin/overview";

type RecentActivityProps = {
  events: AdminActivityEvent[];
  databaseReachable: boolean;
};

function statusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success" || normalized === "processed") return "success" as const;
  if (normalized === "failed" || normalized === "error") return "destructive" as const;
  return "secondary" as const;
}

function eventLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function RecentActivity({ events, databaseReachable }: RecentActivityProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Latest mail sync events. Message contents, addresses and verification codes are never shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {!databaseReachable ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
            Activity is unavailable while the database is offline.
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            <ScrollText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            No sync events recorded yet. They appear here after the first Gmail notification.
          </div>
        ) : (
          <ul className="space-y-1">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/40 py-2.5 last:border-0"
              >
                <span className="text-sm font-medium">{eventLabel(event.eventType)}</span>
                <Badge variant={statusVariant(event.status)} className="text-[10px]">
                  {event.status}
                </Badge>
                {event.errorCode ? (
                  <span className="font-mono text-[11px] text-destructive/90">{event.errorCode}</span>
                ) : null}
                <time
                  dateTime={event.createdAt}
                  title={new Date(event.createdAt).toLocaleString("en-US")}
                  className="ml-auto font-mono text-[11px] text-muted-foreground"
                >
                  {formatRelativeTime(event.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
