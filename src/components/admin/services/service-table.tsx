import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  buildServiceHref,
  isKnownServiceKey,
  serviceLabel,
} from "@/lib/admin/services";
import { formatCount, formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import type { AdminServiceListItem } from "@/server/admin/services";

export function ServiceTable({ services }: { services: AdminServiceListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/40">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
            <th scope="col" className="px-4 py-3 font-medium">
              Service
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Users
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
              title="Users whose linked Gmail mailbox is currently active. This is not external service connectivity."
            >
              Users with active Gmail
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr
              key={service.serviceName}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <Link
                  href={buildServiceHref(service.serviceName)}
                  className="group inline-flex flex-col gap-0.5"
                >
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {serviceLabel(service.serviceName)}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {service.serviceName}
                  </span>
                </Link>
                {!isKnownServiceKey(service.serviceName) ? (
                  <Badge variant="outline" className="mt-2">
                    Unmapped key
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-3 tabular-nums">{formatCount(service.users)}</td>
              <td className="px-4 py-3 tabular-nums">
                {formatCount(service.notifications)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {service.firstSeenAt ? (
                  <span title={formatDateTime(service.firstSeenAt)}>
                    {formatDate(service.firstSeenAt)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {service.lastSeenAt ? (
                  <span title={formatDateTime(service.lastSeenAt)}>
                    {formatRelativeTime(service.lastSeenAt)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {formatCount(service.usersWithActiveGmail)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
