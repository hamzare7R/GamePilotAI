import { redirect } from "next/navigation";
import { Activity, ShieldCheck } from "lucide-react";

import { ConnectedServices } from "@/components/mail-monitor/connected-services";
import { GmailAccountCard } from "@/components/mail-monitor/gmail-account-card";
import { MailQuickActions } from "@/components/mail-monitor/quick-actions";
import { MailStatistics } from "@/components/mail-monitor/mail-statistics";
import { NotificationList } from "@/components/mail-monitor/notification-list";
import { SyncStatus } from "@/components/mail-monitor/sync-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isGmailConfigured } from "@/lib/gmail/env";
import { getSessionUser } from "@/server/auth/user";
import {
  getConnectionForUser,
  getMailSummary,
  listConnectedServices,
  listNotifications,
  listSyncEvents,
} from "@/server/mail/repository";
import type { MailConnection, MailSummary, SyncEvent } from "@/server/mail/types";

export const metadata = { title: "Mail Monitor" };

type PageData = {
  connection: MailConnection | null;
  summary: MailSummary;
  services: Awaited<ReturnType<typeof listConnectedServices>>;
  notifications: Awaited<ReturnType<typeof listNotifications>>;
  events: SyncEvent[];
};

export default async function MailMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string | string[] }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/mail-monitor");

  const params = await searchParams;
  const flash = typeof params.gmail === "string" ? params.gmail : null;
  const configured = isGmailConfigured();

  let data: PageData | null = null;
  try {
    const connection = await getConnectionForUser(user.id);
    const [summary, services, notifications, events] = await Promise.all([
      getMailSummary(user.id),
      listConnectedServices(user.id),
      listNotifications(user.id, 50),
      connection ? listSyncEvents(connection.id, 8) : Promise.resolve([]),
    ]);
    data = { connection, summary, services, notifications, events };
  } catch {
    data = null;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Activity className="size-4" aria-hidden="true" />
            Integrations / Email security
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Mail Monitor</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Monitor account alerts using sender metadata. When you explicitly open a notification,
            GamePilotAI fetches that message's subject and readable content on demand; message content
            is not stored in GamePilotAI. Google's gmail.readonly permission is broad and can technically
            access all messages and settings in the connected Gmail account.
          </p>
        </div>
        <Badge
          variant={data?.connection?.status === "active" ? "success" : "outline"}
          className="mt-1 gap-1.5 px-3 py-1.5"
        >
          <span className={data?.connection?.status === "active" ? "size-1.5 rounded-full bg-emerald-400" : "size-1.5 rounded-full bg-muted-foreground"} />
          {data?.connection?.status === "active" ? "Monitoring active" : data?.connection ? "Needs attention" : "Not connected"}
        </Badge>
      </header>

      {!data ? (
        <Card>
          <CardContent className="flex items-start gap-3 px-6 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="font-medium">Mail Monitor data is temporarily unavailable.</p>
              <p className="mt-1 text-muted-foreground">
                The account database could not be reached. Nothing was changed; try again in a moment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <MailStatistics summary={data.summary} />

          <section aria-label="Email connection and connected services" className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <GmailAccountCard
              configured={configured}
              flash={flash}
              connection={
                data.connection
                  ? {
                      emailAddress: data.connection.emailAddress,
                      status: data.connection.status,
                      lastSyncAt: data.connection.lastSyncAt?.toISOString() ?? null,
                      watchExpiration: data.connection.watchExpiration?.toISOString() ?? null,
                    }
                  : null
              }
            />
            <ConnectedServices services={data.services} />
          </section>

          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
            <NotificationList notifications={data.notifications} />
            <div className="flex flex-col gap-4">
              <MailQuickActions notifications={data.notifications} />
              <SyncStatus connection={data.connection} events={data.events} configured={configured} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
