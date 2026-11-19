import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { GmailStatusBadge } from "@/components/admin/users/status-badges";
import { Button } from "@/components/ui/button";
import { safeUserLabel } from "@/lib/admin/services";
import { formatCount, formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import type { AdminServiceUser } from "@/server/admin/services";

export function ServiceUsersTable({ users }: { users: AdminServiceUser[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/40">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
            <th scope="col" className="px-4 py-3 font-medium">
              User
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Notifications
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              First seen
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Last seen
            </th>
            <th
              scope="col"
              className="px-4 py-3 font-medium"
              title="State of the Gmail mailbox linked to this account. It does not describe connectivity to the detected service."
            >
              Gmail mailbox
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Gmail last sync
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const reference = `User ${user.userId.slice(0, 8)}`;
            const label = safeUserLabel(user.displayName, user.userId);
            return (
              <tr
                key={user.userId}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{label}</span>
                    {label !== reference ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {reference}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatCount(user.notificationCount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.firstSeenAt ? (
                    <span title={formatDateTime(user.firstSeenAt)}>
                      {formatDate(user.firstSeenAt)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.lastSeenAt ? (
                    <span title={formatDateTime(user.lastSeenAt)}>
                      {formatRelativeTime(user.lastSeenAt)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <GmailStatusBadge status={user.gmailStatus} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.gmailLastSyncAt ? (
                    <span title={formatDateTime(user.gmailLastSyncAt)}>
                      {formatDate(user.gmailLastSyncAt)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/users/${encodeURIComponent(user.userId)}`}>
                      View user
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
