import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Bell, Clock, Mail, Plug, RefreshCw, Users } from "lucide-react";

import { OtherSendersCard } from "@/components/admin/services/other-senders-card";
import { ServiceListFilters } from "@/components/admin/services/service-list-filters";
import { ServicePagination } from "@/components/admin/services/service-pagination";
import { ServiceTable } from "@/components/admin/services/service-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_SERVICE_SORT,
  buildServicesHref,
  parseServiceListParams,
  pageWindow,
  safeFailureCode,
} from "@/lib/admin/services";
import { formatCount, formatDateTime, formatRelativeTime } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/admin";
import {
  getAdminServicesSummary,
  getOtherSendersSummary,
  listAdminServices,
} from "@/server/admin/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connected Services",
  robots: { index: false, follow: false },
};

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();

  const parsed = parseServiceListParams(await searchParams);
  const [summaryResult, listResult, otherResult] = await Promise.allSettled([
    getAdminServicesSummary(),
    listAdminServices(parsed),
    getOtherSendersSummary(),
  ]);

  if (summaryResult.status === "rejected") {
    console.error("[admin:services] summary failed:", safeFailureCode(summaryResult.reason));
  }
  if (listResult.status === "rejected") {
    console.error("[admin:services] directory failed:", safeFailureCode(listResult.reason));
  }
  if (otherResult.status === "rejected") {
    console.error("[admin:services] other senders failed:", safeFailureCode(otherResult.reason));
  }

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const list = listResult.status === "fulfilled" ? listResult.value : null;
  const other = otherResult.status === "fulfilled" ? otherResult.value : null;

  const hasFilters = Boolean(parsed.query) || parsed.sort !== DEFAULT_SERVICE_SORT;
  const currentPage = list?.page ?? parsed.page;
  const currentHref = buildServicesHref({ ...parsed, page: currentPage });
  const pagination = list ? pageWindow(list.page, list.total, list.pageSize) : null;

  const stats = [
    {
      label: "Detected services",
      value: summary ? formatCount(summary.detectedServices) : "—",
      hint: summary ? "Distinct service names, excluding other" : "Unavailable",
      icon: Plug,
      accent: "purple" as const,
    },
    {
      label: "Users with detections",
      value: summary ? formatCount(summary.usersWithDetections) : "—",
      hint: summary ? "Distinct users with at least one detection row" : "Unavailable",
      icon: Users,
      accent: "blue" as const,
    },
    {
      label: "Notifications",
      value: summary ? formatCount(summary.notifications) : "—",
      hint: summary ? "Stored notification_count, including other" : "Unavailable",
      icon: Bell,
      accent: "purple" as const,
    },
    {
      label: "Last detection",
      value: summary
        ? summary.lastDetectionAt
          ? formatRelativeTime(summary.lastDetectionAt)
          : "None yet"
        : "—",
      hint: summary
        ? summary.lastDetectionAt
          ? `${formatDateTime(summary.lastDetectionAt)} · includes other`
          : "No detection rows stored"
        : "Unavailable",
      icon: Clock,
      accent: "blue" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner console"
        title="Connected Services"
        description="Services detected from stored Gmail notification history. Detection is based on sender domains — it does not mean GamePilot holds an OAuth connection to that service."
        actions={
          <>
            <Badge variant="outline">Read-only</Badge>
            <Button asChild variant="secondary">
              <Link href={currentHref}>
                <RefreshCw aria-hidden="true" />
                Refresh
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin">Overview</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle>Gmail mailboxes</CardTitle>
          </div>
          <CardDescription>
            OAuth state of mailboxes linked to GamePilot. This is separate from detected services:
            Google is a detected service, Gmail is the connected mailbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Active
                </dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-300 tabular-nums">
                  {formatCount(summary.gmailMailboxes.active)}
                </dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Error</dt>
                <dd className="mt-1 text-lg font-semibold text-red-300 tabular-nums">
                  {formatCount(summary.gmailMailboxes.error)}
                </dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  Revoked
                </dt>
                <dd className="mt-1 text-lg font-semibold text-muted-foreground tabular-nums">
                  {formatCount(summary.gmailMailboxes.revoked)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-amber-200">
              Unavailable. Gmail mailbox state could not be read.
            </p>
          )}
        </CardContent>
      </Card>

      {!summary || !list || !other ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Some service data is temporarily unavailable.</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              A read-only query failed. Nothing was changed; unavailable values are shown as —
              instead of being estimated or replaced with zero.
            </p>
          </div>
        </div>
      ) : null}

      <section aria-label="Detected services" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Detected services</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Server-side search, sorting and pagination across stored detection rows.
            </p>
          </div>
          {list ? <Badge variant="outline">{formatCount(list.total)} matching</Badge> : null}
        </div>

        <ServiceListFilters query={parsed.query} sort={parsed.sort} hasFilters={hasFilters} />

        {list && list.services.length > 0 ? <ServiceTable services={list.services} /> : null}

        {list && list.services.length === 0 ? (
          <EmptyState
            icon={Plug}
            title={hasFilters ? "No services match these filters" : "No services detected yet"}
            description={
              hasFilters
                ? "Adjust the search or sorting to widen the result set."
                : "Known sender domains will appear here once Gmail notifications are stored and classified."
            }
            action={
              hasFilters ? (
                <Button asChild variant="secondary">
                  <Link href="/admin/services">Reset filters</Link>
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {list && list.total > 0 && pagination ? (
          <ServicePagination
            page={list.page}
            pageCount={list.pageCount}
            total={list.total}
            pageSize={list.pageSize}
            start={pagination.start}
            end={pagination.end}
            hrefForPage={(page) => buildServicesHref({ ...parsed, page })}
          />
        ) : null}
      </section>

      <OtherSendersCard summary={other} />

      <div className="space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Detection is not a connection.</span> A
          service appears when a stored Gmail notification sender domain matches the local registry;
          no OAuth grant to that service is implied.
        </p>
        <p>
          Counts come from the derived <span className="font-mono">connected_services</span> table
          and may lag the underlying notification history. First and last seen reflect that table,
          not necessarily the entire mailbox history.
        </p>
        <p>
          &quot;Users with active Gmail&quot; counts linked mailboxes whose OAuth state is active.
          It does not mean the detected service is connected or reachable.
        </p>
      </div>
    </div>
  );
}
