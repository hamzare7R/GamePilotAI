import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Bell, Clock, RefreshCw, Users } from "lucide-react";

import { ServicePagination } from "@/components/admin/services/service-pagination";
import { ServiceUserFilters } from "@/components/admin/services/service-user-filters";
import { ServiceUsersTable } from "@/components/admin/services/service-users-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SERVICE_USER_SORT,
  buildServiceUsersHref,
  isKnownServiceKey,
  isSafeServiceName,
  pageWindow,
  parseServiceUserParams,
  safeFailureCode,
  serviceLabel,
} from "@/lib/admin/services";
import { formatCount, formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/admin";
import { getAdminServiceDetail, listAdminServiceUsers } from "@/server/admin/services";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service details",
  robots: { index: false, follow: false },
};

export default async function AdminServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();

  const { serviceName } = await params;
  if (!isSafeServiceName(serviceName)) notFound();

  const parsed = parseServiceUserParams(await searchParams);
  let detail;
  try {
    detail = await getAdminServiceDetail(serviceName);
  } catch (error) {
    console.error("[admin:services] detail failed:", safeFailureCode(error));
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Detected service"
          title={serviceLabel(serviceName)}
          description={`Registry key: ${serviceName}`}
          actions={
            <Button asChild variant="secondary">
              <Link href="/admin/services">All services</Link>
            </Button>
          }
        />
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Service summary is temporarily unavailable.</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              A read-only query failed. Nothing was changed; no values are estimated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) notFound();

  const [usersResult] = await Promise.allSettled([
    listAdminServiceUsers(serviceName, parsed),
  ]);

  if (usersResult.status === "rejected") {
    console.error("[admin:services] detail users failed:", safeFailureCode(usersResult.reason));
  }

  const users = usersResult.status === "fulfilled" ? usersResult.value : null;
  const hasFilters = Boolean(parsed.query) || parsed.sort !== DEFAULT_SERVICE_USER_SORT;
  const currentPage = users?.page ?? parsed.page;
  const currentHref = buildServiceUsersHref(serviceName, { ...parsed, page: currentPage });
  const pagination = users ? pageWindow(users.page, users.total, users.pageSize) : null;
  const isOther = serviceName === "other";

  const stats = [
    {
      label: "Users",
      value: formatCount(detail.users),
      hint: `${formatCount(detail.usersWithActiveGmail)} with an active Gmail mailbox`,
      icon: Users,
      accent: "purple" as const,
    },
    {
      label: "Notifications",
      value: formatCount(detail.notifications),
      hint: "Stored notification_count for this service",
      icon: Bell,
      accent: "blue" as const,
    },
    {
      label: "First seen",
      value: detail.firstSeenAt ? formatDate(detail.firstSeenAt) : "—",
      hint: detail.firstSeenAt
        ? formatRelativeTime(detail.firstSeenAt)
        : "No detection timestamp",
      icon: Clock,
      accent: "purple" as const,
    },
    {
      label: "Last seen",
      value: detail.lastSeenAt ? formatRelativeTime(detail.lastSeenAt) : "—",
      hint: detail.lastSeenAt ? formatDateTime(detail.lastSeenAt) : "No detection timestamp",
      icon: Clock,
      accent: "blue" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isOther ? "Unmatched sender bucket" : "Detected service"}
        title={serviceLabel(serviceName)}
        description={
          isOther
            ? "Sender domains that did not match the local service registry. This bucket is not a detected service and is excluded from Detected Services."
            : "Detected from sender-domain matches in stored Gmail notifications. Detection does not imply an OAuth connection to this service."
        }
        actions={
          <>
            <Badge
              variant={!isOther && isKnownServiceKey(serviceName) ? "outline" : "secondary"}
            >
              {isOther
                ? "Unmatched bucket"
                : isKnownServiceKey(serviceName)
                  ? "Registered key"
                  : "Unmapped key"}
            </Badge>
            <Badge variant="outline">Read-only</Badge>
            <Button asChild variant="secondary">
              <Link href={currentHref}>
                <RefreshCw aria-hidden="true" />
                Refresh
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/services">All services</Link>
            </Button>
          </>
        }
      />

      <p className="font-mono text-xs text-muted-foreground">Key: {serviceName}</p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section aria-label="Users with detections" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Users with detections</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Display names or short references only. Email addresses and message content are not
              shown.
            </p>
          </div>
          {users ? <Badge variant="outline">{formatCount(users.total)} matching</Badge> : null}
        </div>

        <ServiceUserFilters
          serviceName={serviceName}
          query={parsed.query}
          sort={parsed.sort}
          hasFilters={hasFilters}
        />

        {users && users.users.length > 0 ? <ServiceUsersTable users={users.users} /> : null}

        {users && users.users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No users match these filters" : "No users for this service"}
            description={
              hasFilters
                ? "Adjust the search or sorting to widen the result set."
                : "Detection rows for this service will appear here as notifications are stored."
            }
            action={
              hasFilters ? (
                <Button asChild variant="secondary">
                  <Link href={buildServiceUsersHref(serviceName, { query: "", sort: parsed.sort })}>
                    Reset search
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {!users ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">User rows are temporarily unavailable.</p>
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                The read-only user query failed. Nothing was changed; no rows are estimated.
              </p>
            </div>
          </div>
        ) : null}

        {users && users.total > 0 && pagination ? (
          <ServicePagination
            page={users.page}
            pageCount={users.pageCount}
            total={users.total}
            pageSize={users.pageSize}
            start={pagination.start}
            end={pagination.end}
            hrefForPage={(page) =>
              buildServiceUsersHref(serviceName, { ...parsed, page })
            }
          />
        ) : null}
      </section>

      <div className="space-y-1.5 rounded-xl border border-border/70 bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          Gmail mailbox status describes the platform-linked mailbox for each user. It does not
          describe connectivity to {serviceLabel(serviceName)}.
        </p>
        <p>
          First and last seen come from the derived{" "}
          <span className="font-mono">connected_services</span> row and may lag the underlying
          notification history.
        </p>
        <p>No message subjects, sender addresses, OTP codes or OAuth tokens are displayed.</p>
      </div>
    </div>
  );
}
