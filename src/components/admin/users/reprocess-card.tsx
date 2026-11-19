"use client";

import * as React from "react";
import { Loader2, Pause, Play, RefreshCw, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { ReprocessActionResult, ReprocessRunSummary } from "@/server/admin/reprocess";

const BATCH_DELAY_MS = 350;

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2" title={hint}>
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function statusVariant(status: ReprocessRunSummary["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "paused") return "outline" as const;
  return "secondary" as const;
}

export function ReprocessCard({
  userId,
  initialSummary,
  canRun,
}: {
  userId: string;
  initialSummary: ReprocessRunSummary | null;
  canRun: boolean;
}) {
  const [summary, setSummary] = React.useState<ReprocessRunSummary | null>(initialSummary);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const stopped = React.useRef(false);

  React.useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  const post = React.useCallback(
    async (action: string, runId?: string): Promise<ReprocessActionResult | null> => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/reprocess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(runId ? { action, runId } : { action }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { data?: ReprocessActionResult; error?: { message?: string } }
          | null;
        if (!response.ok || !payload?.data) {
          setError(payload?.error?.message || "The reprocessing request failed.");
          return null;
        }
        if (payload.data.summary) setSummary(payload.data.summary);
        if (!payload.data.ok) setError(payload.data.message);
        return payload.data;
      } catch {
        setError("The request failed before reaching the server.");
        return null;
      }
    },
    [userId],
  );

  const drive = React.useCallback(
    async (runId: string) => {
      while (!stopped.current) {
        const result = await post("batch", runId);
        if (!result?.ok) break;
        if (
          !result.summary ||
          result.summary.status !== "running" ||
          result.summary.remaining <= 0
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    },
    [post],
  );

  async function handleStart() {
    stopped.current = false;
    setBusy(true);
    setError(null);
    const result = await post("start");
    if (result?.ok && result.summary?.runId && result.summary.status === "running") {
      await drive(result.summary.runId);
    }
    setBusy(false);
  }

  async function handleResume() {
    if (!summary?.runId) return;
    stopped.current = false;
    setBusy(true);
    setError(null);
    const result = await post("resume", summary.runId);
    if (result?.ok && result.summary?.status === "running") {
      await drive(summary.runId);
    }
    setBusy(false);
  }

  async function handleContinue() {
    if (!summary?.runId) return;
    stopped.current = false;
    setBusy(true);
    setError(null);
    await drive(summary.runId);
    setBusy(false);
  }

  async function handlePause() {
    if (!summary?.runId) return;
    stopped.current = true;
    setBusy(true);
    // A batch may still hold the lease; retry briefly so pause lands right after it commits.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await post("pause", summary.runId);
      if (!result) break;
      if (result.code === "RUN_BUSY") {
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      if (result.summary?.status === "running") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      break;
    }
    setBusy(false);
  }

  const status = summary?.status ?? null;
  const active = status === "running";
  const resumable = status === "paused" || status === "failed";
  const controlsDisabled = !canRun || busy;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw aria-hidden="true" className="size-4 text-primary" />
          MIME reprocessing
        </CardTitle>
        <CardDescription>
          Re-fetches stored messages from Gmail and rewrites their plain text with the current MIME
          parser. Starts only when you press the button. Message rows, identifiers, relations and
          attachment bytes are never deleted or replaced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total messages" value={summary?.total ?? 0} />
          <Stat label="Processed" value={summary?.processed ?? 0} />
          <Stat label="Updated" value={summary?.updated ?? 0} hint="Rows whose text actually changed" />
          <Stat label="Failed" value={summary?.failed ?? 0} />
          <Stat label="Remaining" value={summary?.remaining ?? 0} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={status ? statusVariant(status) : "outline"}>
            {status ?? "Not started"}
          </Badge>
          {summary?.lastErrorCode ? (
            <span className="font-mono text-[11px] text-destructive/90">{summary.lastErrorCode}</span>
          ) : null}
          {summary?.startedAt ? (
            <span title={formatDateTime(summary.startedAt)}>
              Started {formatDateTime(summary.startedAt)}
            </span>
          ) : null}
          {summary?.completedAt ? (
            <span title={formatDateTime(summary.completedAt)}>
              Finished {formatDateTime(summary.completedAt)}
            </span>
          ) : null}
        </div>

        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <span>
                Runs in batches of 3 messages. Only body_text, snippet and content_fetched_at are
                written, scoped to this user. Attachments are not re-downloaded. Every batch is saved
                before the cursor advances, so a failed or interrupted run resumes from its last saved
                position instead of starting over.
              </span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {active ? (
                <>
                  <Button type="button" size="sm" variant="secondary" disabled={controlsDisabled} onClick={() => void handleContinue()}>
                    {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Play aria-hidden="true" />}
                    Continue
                  </Button>
                  <Button type="button" size="sm" variant="outline" disabled={!canRun || !active} onClick={() => void handlePause()}>
                    <Pause aria-hidden="true" />
                    Pause
                  </Button>
                </>
              ) : resumable ? (
                <Button type="button" size="sm" disabled={controlsDisabled} onClick={() => void handleResume()}>
                  {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Play aria-hidden="true" />}
                  Resume
                </Button>
              ) : (
                <Button type="button" size="sm" disabled={controlsDisabled} onClick={() => void handleStart()}>
                  {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCw aria-hidden="true" />}
                  {summary ? "Run again" : "Start reprocessing"}
                </Button>
              )}
            </div>
          </div>

          {!canRun ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Reprocessing is unavailable because Gmail is not configured or the connection is
              revoked.
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
