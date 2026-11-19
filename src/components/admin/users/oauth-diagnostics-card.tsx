"use client";

import * as React from "react";
import { KeyRound, Loader2, PlugZap, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type {
  AdminUserOAuthDiagnostics,
  AdminUserOAuthTestMode,
  AdminUserOAuthTestResult,
} from "@/server/admin/users";

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

function YesNo({ value, yes = "Yes", no = "No" }: { value: boolean; yes?: string; no?: string }) {
  return <Badge variant={value ? "success" : "outline"}>{value ? yes : no}</Badge>;
}

export function OAuthDiagnosticsCard({
  userId,
  oauth,
  gmailStatus,
}: {
  userId: string;
  oauth: AdminUserOAuthDiagnostics;
  gmailStatus: string | null;
}) {
  const [running, setRunning] = React.useState<AdminUserOAuthTestMode | null>(null);
  const [result, setResult] = React.useState<AdminUserOAuthTestResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canTest =
    oauth.configConfigured && oauth.tokenStored && gmailStatus !== null && gmailStatus !== "revoked";

  async function runTest(mode: AdminUserOAuthTestMode) {
    setRunning(mode);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/oauth-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: AdminUserOAuthTestResult; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.data) {
        setError(payload?.error?.message || "The OAuth test could not run.");
        return;
      }
      setResult(payload.data);
    } catch {
      setError("The request failed before reaching the server.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound aria-hidden="true" className="size-4 text-primary" />
          OAuth diagnostics
        </CardTitle>
        <CardDescription>
          Stored connection facts plus explicit tests. Tokens are decrypted in memory only, never
          shown, and no test runs automatically when this page loads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Connection status">
            {gmailStatus ? (
              <Badge variant={gmailStatus === "active" ? "success" : "secondary"}>
                {gmailStatus}
              </Badge>
            ) : (
              <Badge variant="outline">Not linked</Badge>
            )}
          </Field>
          <Field label="OAuth configuration">
            <YesNo
              value={oauth.configConfigured}
              yes="Required variables present"
              no="Incomplete configuration"
            />
          </Field>
          <Field label="Refresh token stored">
            <YesNo value={oauth.tokenStored} />
          </Field>
          <Field label="Token encrypted (v1 format)">
            <YesNo value={oauth.tokenEncrypted} />
          </Field>
          <Field label="Decrypts with current key">
            <YesNo value={oauth.tokenDecryptable} />
          </Field>
          <Field label="Last successful token use">
            {oauth.lastRefreshEvidenceAt ? (
              <span title={formatDateTime(oauth.lastRefreshEvidenceAt)}>
                {formatRelativeTime(oauth.lastRefreshEvidenceAt)}
              </span>
            ) : (
              "No evidence recorded"
            )}
          </Field>
          <Field label="Last OAuth error code">
            {oauth.lastOAuthErrorCode ? (
              <span className="font-mono text-[11px] text-destructive/90">{oauth.lastOAuthErrorCode}</span>
            ) : (
              <span className="text-xs text-muted-foreground">None recorded</span>
            )}
          </Field>
        </dl>

        {oauth.configProblems.length > 0 ? (
          <ul className="space-y-1 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            {oauth.configProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}

        <div className="rounded-lg border border-border/70 bg-background/30 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <span>
                Tests exchange the stored refresh token for a short-lived access token and discard it.
                Connection state and permissions are not modified.
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!canTest || running !== null}
                onClick={() => void runTest("refresh")}
              >
                {running === "refresh" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <KeyRound aria-hidden="true" />
                )}
                Test refresh token
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canTest || running !== null}
                onClick={() => void runTest("connection")}
              >
                {running === "connection" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <PlugZap aria-hidden="true" />
                )}
                Test mailbox access
              </Button>
            </div>
          </div>

          {!canTest ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Tests are disabled because the connection is missing, revoked or not configured.
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-2 space-y-1 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={result.ok ? "success" : "destructive"}>
                  {result.ok ? "Passed" : "Failed"}
                </Badge>
                <span className="text-muted-foreground">
                  {result.mode === "refresh" ? "Refresh token exchange" : "Mailbox access"} ·{" "}
                  {formatDateTime(result.checkedAt)}
                </span>
                {result.code ? (
                  <span className="font-mono text-[11px] text-destructive/90">{result.code}</span>
                ) : null}
              </div>
              <p>{result.message}</p>
              <p className="text-muted-foreground">
                {result.expiresInSeconds !== null
                  ? `Access token lifetime: ${result.expiresInSeconds}s. `
                  : ""}
                {result.emailMatches === null
                  ? ""
                  : result.emailMatches
                    ? "Mailbox profile matches the stored address."
                    : "Mailbox profile does NOT match the stored address."}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
