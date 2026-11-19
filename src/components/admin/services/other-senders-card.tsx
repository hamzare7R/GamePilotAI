import { CircleHelp } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildServiceHref, serviceLabel } from "@/lib/admin/services";
import { formatCount, formatDate, formatDateTime } from "@/lib/format";
import type { AdminOtherSendersSummary } from "@/server/admin/services";

export function OtherSendersCard({ summary }: { summary: AdminOtherSendersSummary | null }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground">
            <CircleHelp className="size-4" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{serviceLabel("other")}</CardTitle>
              <Badge variant="secondary">Not a detected service</Badge>
            </div>
            <CardDescription>
              Sender domains with no registry match. These rows are stored, but they are excluded
              from the Detected Services count.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Users</dt>
                <dd className="mt-1 font-medium tabular-nums">{formatCount(summary.users)}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Notifications
                </dt>
                <dd className="mt-1 font-medium tabular-nums">
                  {formatCount(summary.notifications)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  First seen
                </dt>
                <dd className="mt-1 text-muted-foreground" title={summary.firstSeenAt ? formatDateTime(summary.firstSeenAt) : undefined}>
                  {summary.firstSeenAt ? formatDate(summary.firstSeenAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Last seen
                </dt>
                <dd className="mt-1 text-muted-foreground" title={summary.lastSeenAt ? formatDateTime(summary.lastSeenAt) : undefined}>
                  {summary.lastSeenAt ? formatDate(summary.lastSeenAt) : "—"}
                </dd>
              </div>
            </dl>
            {summary.users > 0 ? (
              <Button asChild variant="secondary" size="sm">
                <Link href={buildServiceHref("other")}>View unmatched senders</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                No unmatched sender rows are currently stored.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-amber-200">
            Unavailable. The unmatched sender summary could not be read.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
