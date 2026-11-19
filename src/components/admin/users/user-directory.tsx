import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { GmailStatusBadge, SessionStatusBadge } from "@/components/admin/users/status-badges";
import { Button } from "@/components/ui/button";
import { formatBytes, formatCount, formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import type { AdminUserListItem } from "@/server/admin/users";

export function UserDirectory({ users }: { users: readonly AdminUserListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/30">
      <table className="w-full min-w-[1080px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Registered</th>
            <th className="px-4 py-3 font-semibold">Session</th>
            <th className="px-4 py-3 font-semibold">Gmail</th>
            <th className="px-4 py-3 text-right font-semibold">Notifications</th>
            <th className="px-4 py-3 text-right font-semibold">Attachments</th>
            <th className="px-4 py-3 text-right font-semibold">Storage</th>
            <th className="px-4 py-3 font-semibold">Last login</th>
            <th className="px-4 py-3 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <Link href={`/admin/users/${user.id}`} className="group block max-w-[260px]">
                  <p className="truncate font-medium transition-colors group-hover:text-primary">
                    {user.displayName || "Unnamed account"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDate(user.createdAt)}
              </td>
              <td className="px-4 py-3">
                <SessionStatusBadge
                  totalSessions={user.totalSessions}
                  activeSessions={user.activeSessions}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatCount(user.totalSessions)} stored
                </p>
              </td>
              <td className="px-4 py-3">
                <GmailStatusBadge status={user.gmail?.status ?? null} />
                <p className="mt-1 max-w-[190px] truncate text-[11px] text-muted-foreground">
                  {user.gmail?.emailAddress ?? "No Gmail linked"}
                </p>
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs">
                {formatCount(user.totalNotifications)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs">
                {formatCount(user.totalAttachments)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs">
                {formatBytes(user.attachmentBytes)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {user.lastLoginAt ? (
                  <time
                    dateTime={user.lastLoginAt}
                    title={formatDateTime(user.lastLoginAt)}
                    className="font-mono text-[11px]"
                  >
                    {formatRelativeTime(user.lastLoginAt)}
                  </time>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/users/${user.id}`} aria-label={`View ${user.email}`}>
                    View
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
