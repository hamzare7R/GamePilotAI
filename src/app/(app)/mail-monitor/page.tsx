import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import { ConnectedServices } from "@/components/mail-monitor/connected-services";
import { GmailAccountCard } from "@/components/mail-monitor/gmail-account-card";
import { MailStatistics } from "@/components/mail-monitor/mail-statistics";
import { NotificationList } from "@/components/mail-monitor/notification-list";
import { SyncStatus } from "@/components/mail-monitor/sync-status";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <p className="text-sm text-muted-foreground">Integrations</p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mail Monitor</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Detect security and account notifications from the services you use. GamePilot reads sender metadata only —
          never message bodies, subjects or verification codes.
        </p>
      </header>

      {!data ? (
        <Card>
          <CardContent className="flex items-start gap-3 px-6 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
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

          <div className="grid gap-4 lg:grid-cols-2">
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
          </div>

          <NotificationList notifications={data.notifications} />
          <SyncStatus connection={data.connection} events={data.events} configured={configured} />
        </>
      )}
    </div>
  );
}
