"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Paperclip, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmailContent = {
  subject: string;
  from: string;
  to: string;
  date: string;
  bodyText: string;
  snippet: string;
  attachments: string[];
};

export function InAppEmailContent({ notificationId }: { notificationId: string }) {
  const [email, setEmail] = useState<EmailContent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEmail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/integrations/gmail/messages/${encodeURIComponent(notificationId)}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as EmailContent | { error?: string } | null;
      if (!response.ok) {
        throw new Error(data && "error" in data && data.error ? data.error : "Could not load this email.");
      }
      setEmail(data as EmailContent);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this email.");
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    void loadEmail();
  }, [loadEmail]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Email content</CardTitle>
            <CardDescription>
              Loaded securely from your connected Gmail account when you open this page. The message is not saved in GamePilotAI.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading email from Gmail…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <p>{error}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadEmail()}>
              <RefreshCw aria-hidden="true" /> Try again
            </Button>
            {error.toLowerCase().includes("reconnect") || error.toLowerCase().includes("renewed") ? (
              <Button asChild size="sm" className="ml-2 mt-4">
                <a href="/api/integrations/gmail/connect">Reconnect Gmail</a>
              </Button>
            ) : null}
          </div>
        ) : email ? (
          <div className="space-y-5">
            <div className="space-y-2 border-b border-border/60 pb-4">
              <h2 className="break-words text-xl font-semibold">{email.subject}</h2>
              <p className="break-all text-sm text-muted-foreground">From: {email.from || "Unknown sender"}</p>
              {email.to ? <p className="break-all text-sm text-muted-foreground">To: {email.to}</p> : null}
              {email.date ? <p className="text-xs text-muted-foreground">{email.date}</p> : null}
            </div>
            {email.bodyText ? (
              <div className="max-h-[65vh] overflow-y-auto rounded-xl bg-muted/30 p-4 text-sm leading-7 whitespace-pre-wrap break-words">
                {email.bodyText}
              </div>
            ) : (
              <p className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
                No readable text body was found. This message may contain only images or unsupported content.
              </p>
            )}
            {email.attachments.length ? (
              <div className="border-t border-border/60 pt-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Paperclip className="size-4" aria-hidden="true" /> Attachments ({email.attachments.length})
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {email.attachments.map((name, index) => <li key={`${name}-${index}`} className="break-all">{name}</li>)}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Attachments are listed only; files are not downloaded or stored.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
