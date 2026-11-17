import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, SERVICE_LABELS, type MessageCategory, type ServiceKey } from "@/lib/gmail/service-map";
import { getSessionUser } from "@/server/auth/user";
import { listNotificationsForService } from "@/server/mail/repository";

export const metadata = { title: "Service details | Mail Monitor" };

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value) : "Date unavailable";
}

export default async function ServiceDetailsPage({
  params,
}: {
  params: Promise<{ serviceName: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mail-monitor");

  const { serviceName: rawServiceName } = await params;
  const serviceName = decodeURIComponent(rawServiceName);
  const notifications = await listNotificationsForService(user.id, serviceName);
  if (notifications.length === 0) notFound();

  const service = SERVICE_LABELS[serviceName as ServiceKey] ?? "Other services";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/mail-monitor"><ArrowLeft aria-hidden="true" /> Back to Mail Monitor</Link>
        </Button>
        <p className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
          <Mail className="size-4" aria-hidden="true" /> Connected service
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{service}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review account alerts detected for this service. Open any record in Gmail to view the original email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Detected activity</CardTitle>
              <CardDescription>Only sender and message metadata is shown here.</CardDescription>
            </div>
            <Badge variant="outline">{notifications.length} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((notification) => {
            const category = CATEGORY_LABELS[notification.messageCategory as MessageCategory] ?? "Unknown sender";
            const gmailUrl = `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(notification.gmailMessageId)}`;
            return (
              <div key={notification.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{category}</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {notification.senderAddress || notification.senderDomain || "Unknown sender"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(notification.receivedAt)}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <a href={gmailUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" /> Open in Gmail
                  </a>
                </Button>
              </div>
            );
          })}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            GamePilotAI does not access email subjects, message bodies, attachments, or verification codes. Manage or revoke the Gmail connection from the Mail Monitor dashboard.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
