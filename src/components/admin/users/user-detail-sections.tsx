import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatCount, formatDate, formatDateTime, formatRelativeTime } from "@/lib/format";
import { SERVICE_LABELS, type ServiceKey } from "@/lib/gmail/service-map";
import type { AdminUserDetail } from "@/server/admin/users";

import { GmailStatusBadge } from "./status-badges";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function MiniStat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2" title={title}>
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function eventStatusVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success" || normalized === "processed") return "success" as const;
  if (normalized === "failed" || normalized === "error") return "destructive" as const;
  return "secondary" as const;
}

function eventLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function watchBadge(iso: string | null) {
  if (!iso) return { label: "Not set", variant: "outline" as const };
  return new Date(iso).getTime() > Date.now()
    ? { label: "Active", variant: "success" as const }
    : { label: "Expired", variant: "outline" as const };
}

export function AccountInformationCard({ detail }: { detail: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account information</CardTitle>
        <CardDescription>Identity fields stored in the production users table.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="User ID">
            <span className="font-mono text-xs break-all">{detail.id}</span>
          </Field>
          <Field label="Display name">{detail.displayName || "Not set"}</Field>
          <Field label="Email">{detail.email}</Field>
          <Field label="Registration date">{formatDate(detail.createdAt)}</Field>
        </dl>
      </CardContent>
    </Card>
  );
}

export function SessionActivityCard({ detail }: { detail: AdminUserDetail }) {
  const { sessions } = detail;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session activity</CardTitle>
        <CardDescription>
          Latest 20 sessions. A valid session only means the stored session has not expired — it does
          not mean the user is online now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <MiniStat label="Total sessions" value={formatCount(sessions.totalSessions)} />
          <MiniStat label="Valid sessions" value={formatCount(sessions.activeSessions)} />
          <MiniStat
            label="Last login"
            value={sessions.lastLoginAt ? formatRelativeTime(sessions.lastLoginAt) : "—"}
            title={sessions.lastLoginAt ? formatDateTime(sessions.lastLoginAt) : undefined}
          />
        </div>

        {sessions.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No sessions have been created for this account.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[440px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                  <th className="px-3 py-2.5 font-semibold">Created at</th>
                  <th className="px-3 py-2.5 font-semibold">Expires at</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.items.map((session) => (
                  <tr
                    key={`${session.createdAt}-${session.expiresAt}`}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(session.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(session.expiresAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={session.isActive ? "success" : "outline"}>
                        {session.isActive ? "Valid" : "Expired"}
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

export function GmailConnectionCard({ detail }: { detail: AdminUserDetail }) {
  const { gmail } = detail;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gmail connection</CardTitle>
        <CardDescription>Authorized mailbox metadata only. Tokens and message content are never shown.</CardDescription>
      </CardHeader>
      <CardContent>
        {!gmail ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No Gmail account is linked to this user.
          </p>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Gmail account">
                <span className="font-mono text-xs break-all">{gmail.emailAddress}</span>
              </Field>
              <Field label="Connection status">
                <GmailStatusBadge status={gmail.status} />
              </Field>
              <Field label="Last sync">
                {gmail.lastSyncAt ? (
                  <span title={formatDateTime(gmail.lastSyncAt)}>
                    {formatRelativeTime(gmail.lastSyncAt)}
                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(gmail.lastSyncAt)}
                    </span>
                  </span>
                ) : (
                  "Never"
                )}
              </Field>
              <Field label="Watch expiration">
                <span className="flex flex-wrap items-center gap-2">
                  {gmail.watchExpiration ? formatDateTime(gmail.watchExpiration) : "Not set"}
                  <Badge variant={watchBadge(gmail.watchExpiration).variant}>
                    {watchBadge(gmail.watchExpiration).label}
                  </Badge>
                </span>
              </Field>
              <Field label="Connected at">
                {gmail.connectedAt ? formatDateTime(gmail.connectedAt) : "—"}
              </Field>
            </dl>
            {gmail.status === "revoked" ? (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
                Access is revoked. Previously imported notifications and attachments are retained, but
                new mail is no longer synced.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MailStatisticsCard({ detail }: { detail: AdminUserDetail }) {
  const { mail } = detail;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mail statistics</CardTitle>
        <CardDescription>Aggregate counts only — subjects, senders and bodies are excluded.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <MiniStat label="Notifications" value={formatCount(mail.totalNotifications)} />
          <MiniStat label="Security alerts" value={formatCount(mail.securityNotifications)} />
          <MiniStat label="Attachments" value={formatCount(mail.totalAttachments)} />
          <MiniStat label="Attachment storage" value={formatBytes(mail.attachmentBytes)} />
          <MiniStat
            label="Last notification"
            value={mail.lastNotificationAt ? formatRelativeTime(mail.lastNotificationAt) : "None yet"}
            title={mail.lastNotificationAt ? formatDateTime(mail.lastNotificationAt) : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function ConnectedServicesCard({ detail }: { detail: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected services</CardTitle>
        <CardDescription>Services detected across this user&apos;s stored notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        {detail.services.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No services have been detected for this account.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                  <th className="px-3 py-2.5 font-semibold">Service</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Notifications</th>
                  <th className="px-3 py-2.5 font-semibold">First detected</th>
                  <th className="px-3 py-2.5 font-semibold">Last detected</th>
                </tr>
              </thead>
              <tbody>
                {detail.services.map((service) => (
                  <tr key={service.serviceName} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2.5 font-medium">
                      {SERVICE_LABELS[service.serviceName as ServiceKey] ?? service.serviceName}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {formatCount(service.notificationCount)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {formatDate(service.firstDetectedAt)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {formatDate(service.lastDetectedAt)}
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

export function RecentSyncEventsCard({ detail }: { detail: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent sync events</CardTitle>
        <CardDescription>Latest 10 events for this user&apos;s Gmail connection.</CardDescription>
      </CardHeader>
      <CardContent>
        {!detail.gmail ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No Gmail connection is linked, so no sync events are stored.
          </p>
        ) : detail.events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No sync events have been recorded for this connection.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                  <th className="px-3 py-2.5 font-semibold">Event</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Error code</th>
                  <th className="px-3 py-2.5 font-semibold">Created at</th>
                </tr>
              </thead>
              <tbody>
                {detail.events.map((event) => (
                  <tr key={event.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2.5 font-medium">{eventLabel(event.eventType)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={eventStatusVariant(event.status)}>{event.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {event.errorCode ? (
                        <span className="font-mono text-[11px] text-destructive/90">
                          {event.errorCode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(event.createdAt)}
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
