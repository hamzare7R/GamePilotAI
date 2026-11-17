import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, SERVICE_LABELS, type MessageCategory, type ServiceKey } from "@/lib/gmail/service-map";

function serviceLabel(value: string) {
  return SERVICE_LABELS[value as ServiceKey] ?? "Other services";
}

function categoryLabel(value: string) {
  return CATEGORY_LABELS[value as MessageCategory] ?? "Unknown sender";
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleString() : "—";
}

export function NotificationList({
  notifications,
}: {
  notifications: Array<{
    id: string;
    serviceName: string;
    messageCategory: string;
    senderDomain: string;
    receivedAt: Date | null;
    processingStatus: string;
  }>;
}) {
  return (
    <Card id="recent-notifications" className="scroll-mt-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Activity details</CardTitle>
            <CardDescription>Recent account and security events detected from sender metadata.</CardDescription>
          </div>
          <Badge variant="outline">{notifications.length} records</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing detected yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                  <th className="pb-2 pr-3 font-semibold">Service</th>
                  <th className="pb-2 pr-3 font-semibold">Sender domain</th>
                  <th className="pb-2 pr-3 font-semibold">Category</th>
                  <th className="pb-2 pr-3 font-semibold">Received</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id} className="border-b border-border/40 transition-colors hover:bg-muted/20 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">
                      <Link href={`/mail-monitor/notifications/${notification.id}`} className="inline-flex items-center gap-1.5 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {serviceLabel(notification.serviceName)}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{notification.senderDomain || "—"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {categoryLabel(notification.messageCategory)}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatDate(notification.receivedAt)}</td>
                    <td className="py-2.5">
                      <Badge variant={notification.processingStatus === "processed" ? "success" : "outline"}>
                        {notification.processingStatus === "processed" ? "Processed" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
