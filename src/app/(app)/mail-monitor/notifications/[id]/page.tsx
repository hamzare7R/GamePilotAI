import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, SERVICE_LABELS, type MessageCategory, type ServiceKey } from "@/lib/gmail/service-map";
import { InAppEmailContent } from "@/components/mail-monitor/in-app-email-content";
import { getSessionUser } from "@/server/auth/user";
import { getNotificationForUser } from "@/server/mail/repository";

export const metadata = { title: "Notification details | Mail Monitor" };

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(value) : "Date unavailable";
}

export default async function NotificationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mail-monitor");

  const { id } = await params;
  const notification = await getNotificationForUser(user.id, id);
  if (!notification) notFound();

  const service = SERVICE_LABELS[notification.serviceName as ServiceKey] ?? "Other services";
  const category = CATEGORY_LABELS[notification.messageCategory as MessageCategory] ?? "Unknown sender";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/mail-monitor"><ArrowLeft aria-hidden="true" /> Back to Mail Monitor</Link>
        </Button>
        <p className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
          <Mail className="size-4" aria-hidden="true" /> Notification details
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{service}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Read the original message without leaving GamePilotAI.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Message information</CardTitle>
              <CardDescription>Details detected from Gmail message metadata.</CardDescription>
            </div>
            <Badge variant={notification.processingStatus === "processed" ? "success" : "outline"}>
              {notification.processingStatus === "processed" ? "Processed" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-4">
              <dt className="text-xs text-muted-foreground">Service / game</dt>
              <dd className="mt-1 font-semibold">{service}</dd>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <dt className="text-xs text-muted-foreground">Message category</dt>
              <dd className="mt-1 font-semibold">{category}</dd>
            </div>
            <div className="rounded-xl border border-border/60 p-4 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Sender</dt>
              <dd className="mt-1 break-all font-medium">{notification.senderAddress || notification.senderDomain || "Unknown sender"}</dd>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <dt className="text-xs text-muted-foreground">Sender domain</dt>
              <dd className="mt-1 break-all font-medium">{notification.senderDomain || "—"}</dd>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <dt className="text-xs text-muted-foreground">Received</dt>
              <dd className="mt-1 font-medium">{formatDate(notification.receivedAt)}</dd>
            </div>
          </dl>

        </CardContent>
      </Card>

      <InAppEmailContent notificationId={notification.id} />
    </div>
  );
}
