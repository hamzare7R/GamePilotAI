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
    <Card>
      <CardHeader>
        <CardTitle>Recent notifications</CardTitle>
        <CardDescription>Metadata only: sender domain, service, category and time. No content is stored.</CardDescription>
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
                  <tr key={notification.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{serviceLabel(notification.serviceName)}</td>
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
