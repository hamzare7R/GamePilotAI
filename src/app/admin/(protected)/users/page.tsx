import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  MailX,
  RefreshCw,
  Users,
} from "lucide-react";

import { UserDirectory } from "@/components/admin/users/user-directory";
import { UserListFilters } from "@/components/admin/users/user-list-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/admin";
import {
  getAdminUserSummary,
  listAdminUsers,
  type AdminGmailFilter,
  type AdminSessionFilter,
  type AdminUserSort,
} from "@/server/admin/users";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

const SESSION_FILTERS = ["all", "active", "expired", "none"] as const;
const GMAIL_FILTERS = ["all", "connected", "error", "revoked", "none"] as const;
const SORTS = ["newest", "oldest", "name", "notifications", "storage", "last_login"] as const;

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function failureCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return error instanceof Error ? error.name : "unknown";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    session?: string;
    gmail?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const session: AdminSessionFilter = oneOf(params.session, SESSION_FILTERS, "all");
  const gmail: AdminGmailFilter = oneOf(params.gmail, GMAIL_FILTERS, "all");
  const sort: AdminUserSort = oneOf(params.sort, SORTS, "newest");
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);

  const [summaryResult, listResult] = await Promise.allSettled([
    getAdminUserSummary(),
    listAdminUsers({ query, session, gmail, sort, page: requestedPage }),
  ]);

  if (summaryResult.status === "rejected") {
    console.error("[admin:users] summary failed:", failureCode(summaryResult.reason));
  }
  if (listResult.status === "rejected") {
    console.error("[admin:users] directory failed:", failureCode(listResult.reason));
  }

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const list = listResult.status === "fulfilled" ? listResult.value : null;

  const hasFilters = Boolean(query) || session !== "all" || gmail !== "all" || sort !== "newest";

  function usersHref(pageNumber: number) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (session !== "all") search.set("session", session);
    if (gmail !== "all") search.set("gmail", gmail);
    if (sort !== "newest") search.set("sort", sort);
    if (pageNumber > 1) search.set("page", String(pageNumber));
    const value = search.toString();
    return value ? `/admin/users?${value}` : "/admin/users";
  }

  const stats = [
    {
      label: "Total users",
      value: summary ? formatCount(summary.totalUsers) : "—",
      hint: summary ? "Registered accounts" : "Unavailable",
      icon: Users,
      accent: "purple" as const,
    },
    {
      label: "Users with active sessions",
      value: summary ? formatCount(summary.usersWithActiveSessions) : "—",
      hint: summary ? "Valid stored sessions, not live presence" : "Unavailable",
      icon: KeyRound,
      accent: "blue" as const,
    },
    {
      label: "Gmail connected",
      value: summary ? formatCount(summary.gmailConnected) : "—",
      hint: summary ? "Authorized connections" : "Unavailable",
      icon: Mail,
      accent: "purple" as const,
    },
    {
      label: "Users without Gmail",
      value: summary ? formatCount(summary.usersWithoutGmail) : "—",
      hint: summary ? "No Gmail row linked" : "Unavailable",
      icon: MailX,
      accent: "blue" as const,
    },
  ];

  const start = list && list.total > 0 ? (list.page - 1) * list.pageSize + 1 : 0;
  const end = list ? Math.min(list.page * list.pageSize, list.total) : 0;
  const noAccounts = !hasFilters && summary?.totalUsers === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner console"
        title="Users"
        description="Read-only directory built from stored account, session and mail data. A valid session means it has not expired — it does not mean the user is online."
        actions={
          <>
            <Badge variant="outline">Read-only</Badge>
            <Button asChild variant="secondary">
              <Link href={usersHref(list?.page ?? requestedPage)}>
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

      {!summary || !list ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">User data is temporarily unavailable.</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              The database could not be reached or the aggregate queries failed. Nothing was changed;
              unavailable values are shown as — instead of being estimated.
            </p>
          </div>
        </div>
      ) : null}

      <section aria-label="User directory" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Directory</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Server-side search, filters and pagination across production accounts.
            </p>
          </div>
          {list ? (
            <Badge variant="outline">{formatCount(list.total)} matching</Badge>
          ) : null}
        </div>

        <UserListFilters
          query={query}
          session={session}
          gmail={gmail}
          sort={sort}
          hasFilters={hasFilters}
        />

        {list && list.users.length > 0 ? <UserDirectory users={list.users} /> : null}

        {list && list.users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={noAccounts ? "No accounts yet" : "No users match these filters"}
            description={
              noAccounts
                ? "Registered accounts will appear here as soon as users sign up."
                : "Adjust the search or filters to widen the result set."
            }
            action={
              hasFilters ? (
                <Button asChild variant="secondary">
                  <Link href="/admin/users">Reset filters</Link>
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {list && list.total > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {formatCount(start)}–{formatCount(end)} of {formatCount(list.total)} users ·{" "}
              {list.pageSize} per page
            </p>
            <div className="flex items-center gap-2">
              {list.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={usersHref(list.page - 1)}>
                    <ChevronLeft aria-hidden="true" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Button>
              )}
              <span className="font-mono text-[11px] text-muted-foreground">
                Page {list.page} / {list.pageCount}
              </span>
              {list.page < list.pageCount ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={usersHref(list.page + 1)}>
                    Next
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Last login is the newest stored session creation time. A valid session reflects session
          expiry only, not live presence. Account and mail records are read-only in this phase.
        </p>
      </section>
    </div>
  );
}
