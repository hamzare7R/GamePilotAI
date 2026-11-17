"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Link2Off, Loader2, Mail, Plug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ConnectionView = {
  emailAddress: string;
  status: "active" | "error" | "revoked";
  lastSyncAt: string | null;
  watchExpiration: string | null;
} | null;

const FLASH: Record<string, { tone: "success" | "warning" | "error"; message: string }> = {
  connected: { tone: "success", message: "Gmail connected. Inbox monitoring is now active." },
  watch_failed: {
    tone: "warning",
    message: "Gmail connected, but inbox watching could not start. Check the Pub/Sub configuration.",
  },
  already_linked: {
    tone: "error",
    message: "This Gmail address is already linked to another GamePilot account.",
  },
  denied: { tone: "warning", message: "Google authorization was cancelled." },
  invalid_state: { tone: "error", message: "The connection request expired or was tampered with. Try again." },
  scope_missing: { tone: "error", message: "Google did not grant the Gmail read-only permission. Please reconnect and approve the requested access." },
  no_refresh_token: {
    tone: "error",
    message: "Google did not grant offline access. Remove GamePilot from your Google permissions, then retry.",
  },
  not_configured: { tone: "error", message: "Gmail integration is not configured on this deployment." },
  failed: { tone: "error", message: "The Gmail connection could not be completed." },
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not yet" : date.toLocaleString();
}

export function GmailAccountCard({
  configured,
  connection,
  flash,
}: {
  configured: boolean;
  connection: ConnectionView;
  flash?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const notice = flash ? FLASH[flash] : undefined;

  async function disconnect() {
    setPending(true);
    setActionError(null);
    try {
      const response = await fetch("/api/integrations/gmail/disconnect", { method: "POST" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setActionError(payload?.error?.message ?? "Could not disconnect Gmail.");
        return;
      }
      router.refresh();
    } catch {
      setActionError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4 text-primary" aria-hidden="true" />
              Gmail connection
            </CardTitle>
            <CardDescription>
              Google's gmail.readonly permission can technically access all messages and settings in your Gmail account. GamePilotAI fetches only a notification you explicitly open; message content is not stored in GamePilotAI.
            </CardDescription>
          </div>
          {connection ? (
            <Badge variant={connection.status === "active" ? "success" : "destructive"}>
              {connection.status === "active" ? "Connected" : connection.status === "error" ? "Needs attention" : "Revoked"}
            </Badge>
          ) : (
            <Badge variant="outline">Not connected</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {notice ? (
          <p
            role="status"
            className={
              notice.tone === "success"
                ? "flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300"
                : notice.tone === "warning"
                  ? "flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
                  : "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {notice.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            {notice.message}
          </p>
        ) : null}

        {!configured ? (
          <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Gmail integration is not configured on this deployment. Ask the owner to set the Google OAuth and Pub/Sub
            environment variables.
          </p>
        ) : connection ? (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Gmail account</dt>
                <dd className="truncate font-medium">{connection.emailAddress}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last sync</dt>
                <dd className="font-medium">{formatDate(connection.lastSyncAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Watch expires</dt>
                <dd className="font-medium">{formatDate(connection.watchExpiration)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <a href="/api/integrations/gmail/connect">
                  <Plug aria-hidden="true" />
                  Reconnect
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void disconnect()} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2Off aria-hidden="true" />}
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connect your Gmail inbox to detect security and account notifications from the services you use. You can
              disconnect at any time, which also revokes the Google grant.
            </p>
            <Button asChild className="w-fit">
              <a href="/api/integrations/gmail/connect">
                <Plug aria-hidden="true" />
                Connect Gmail
              </a>
            </Button>
          </>
        )}

        {actionError ? (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
