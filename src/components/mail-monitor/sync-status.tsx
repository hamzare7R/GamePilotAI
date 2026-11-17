"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncEvent } from "@/server/mail/types";

function formatDate(value: Date | null) {
  return value ? value.toLocaleString() : "Not yet";
}

export function SyncStatus({
  connection,
  events,
  configured,
}: {
  connection: {
    status: "active" | "error" | "revoked";
    lastSyncAt: Date | null;
    watchExpiration: Date | null;
  } | null;
  events: SyncEvent[];
  configured: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const failedEvents = events.filter((event) => event.status === "failed");

  async function syncNow() {
    setPending(true);
    setFeedback(null);
    setFeedbackError(false);
    try {
      const response = await fetch("/api/integrations/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { status?: string; processed?: number; skipped?: number; errorCode?: string };
        error?: { message?: string; code?: string };
      } | null;

      if (!response.ok) {
        setFeedbackError(true);
        setFeedback(payload?.error?.message ?? "Could not sync Gmail. Please try again.");
        return;
      }

      if (payload?.data?.status !== "ok") {
        setFeedbackError(true);
        setFeedback(
          payload?.data?.errorCode
            ? `Gmail sync failed: ${payload.data.errorCode}`
            : "Gmail sync did not complete successfully.",
        );
        router.refresh();
        return;
      }

      setFeedback(
        `Sync completed. ${payload.data.processed ?? 0} new notifications processed; stored sender metadata was rechecked.`,
      );
      router.refresh();
    } catch {
      setFeedbackError(true);
      setFeedback("Network error while syncing Gmail. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Synchronization status</CardTitle>
            <CardDescription>
              Watches are renewed daily; a safety sync covers delayed Pub/Sub deliveries.
            </CardDescription>
          </div>
          {connection?.status === "active" && configured ? (
            <Button type="button" size="sm" onClick={() => void syncNow()} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              {pending ? "Syncing..." : "Sync now"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {feedback ? (
          <p
            role={feedbackError ? "alert" : "status"}
            className={
              feedbackError
                ? "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                : "rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300"
            }
          >
            {feedback}
          </p>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Last successful sync</dt>
            <dd className="font-medium">{formatDate(connection?.lastSyncAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Watch expiration</dt>
            <dd className="font-medium">{formatDate(connection?.watchExpiration ?? null)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Refresh status</dt>
            <dd className="font-medium">
              {!configured ? "Not configured" : connection ? "Offline access granted" : "No connection"}
            </dd>
          </div>
        </dl>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Recent events</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sync events recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={event.status === "failed" ? "destructive" : event.status === "success" ? "success" : "outline"}>
                    {event.status}
                  </Badge>
                  <span className="font-medium">{event.eventType.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                  {event.errorCode ? <span className="text-xs text-destructive">{event.errorCode}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {failedEvents.length > 0 ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {failedEvents.length} recent event{failedEvents.length === 1 ? "" : "s"} failed. Reconnect Gmail if the
            grant was revoked.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
