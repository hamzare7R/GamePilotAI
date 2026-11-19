"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Code2, Mail, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBytes, formatCount, formatDateTime } from "@/lib/format";
import type {
  AdminUserMessageDetail,
  AdminUserMessageHtmlResult,
  AdminUserMessageListResult,
} from "@/server/admin/users";

type MessageExplorerProps = {
  userId: string;
  result: AdminUserMessageListResult;
};

function contentBadge(message: AdminUserMessageListResult["messages"][number]) {
  if (message.contentBytes > 0) {
    return { label: `Stored · ${formatBytes(message.contentBytes)}`, variant: "success" as const };
  }
  if (message.contentFetchedAt) {
    return { label: "Fetched · empty", variant: "outline" as const };
  }
  return { label: "Not fetched", variant: "outline" as const };
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;
  if (!response.ok || !payload || payload.data === undefined) {
    throw new Error(payload?.error?.message || "The request failed.");
  }
  return payload.data;
}

/**
 * Wraps the original Gmail HTML in a restrictive document CSP. Together with
 * the iframe sandbox (no allow-scripts, no allow-same-origin) it blocks scripts,
 * remote tracking images and any access to the owner console.
 */
function sandboxDocument(html: string) {
  const csp =
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank"></head><body>${html}</body></html>`;
}

function MessageDetailDialog({
  open,
  onOpenChange,
  userId,
  message,
  detail,
  detailError,
  loadingDetail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  message: AdminUserMessageListResult["messages"][number] | null;
  detail: AdminUserMessageDetail | null;
  detailError: string | null;
  loadingDetail: boolean;
}) {
  const [htmlState, setHtmlState] = React.useState<{
    status: "idle" | "loading" | "error";
    result?: AdminUserMessageHtmlResult;
    errorMessage?: string;
  }>({ status: "idle" });

  async function loadHtml(target: AdminUserMessageListResult["messages"][number]) {
    setHtmlState({ status: "loading" });
    try {
      const response = await fetch(`/api/admin/users/${userId}/messages/${target.id}/html`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string; code?: string } }
          | null;
        setHtmlState({
          status: "error",
          errorMessage: payload?.error?.message || "Gmail did not return the original HTML.",
        });
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | { data?: AdminUserMessageHtmlResult }
        | null;
      if (!payload?.data) {
        setHtmlState({ status: "error", errorMessage: "Unexpected response from the server." });
        return;
      }
      setHtmlState({ status: "idle", result: payload.data });
    } catch {
      setHtmlState({ status: "error", errorMessage: "The request failed before reaching Gmail." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{message?.subject || "Message"}</DialogTitle>
          <DialogDescription>
            Stored copy for this user. The original HTML is fetched from Gmail only when you ask for
            it.
          </DialogDescription>
        </DialogHeader>

        {message ? (
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
              <dt className="font-semibold tracking-widest text-muted-foreground uppercase">Sender</dt>
              <dd className="mt-1 break-all">{message.sender || "—"}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
              <dt className="font-semibold tracking-widest text-muted-foreground uppercase">
                Recipient
              </dt>
              <dd className="mt-1 break-all">{message.recipient || "—"}</dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
              <dt className="font-semibold tracking-widest text-muted-foreground uppercase">
                Received
              </dt>
              <dd className="mt-1">
                {message.receivedAt ? formatDateTime(message.receivedAt) : "Unknown"}
              </dd>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/30 px-3 py-2">
              <dt className="font-semibold tracking-widest text-muted-foreground uppercase">
                Message ID
              </dt>
              <dd className="mt-1 font-mono break-all">{message.gmailMessageId}</dd>
            </div>
          </dl>
        ) : null}

        <Tabs defaultValue="text">
          <TabsList>
            <TabsTrigger value="text">Plain text</TabsTrigger>
            <TabsTrigger value="html">
              <Code2 aria-hidden="true" />
              Original HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            {loadingDetail ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading stored text…</p>
            ) : detailError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {detailError}
              </p>
            ) : detail && detail.bodyText ? (
              <pre className="max-h-[55vh] overflow-auto rounded-lg border border-border/70 bg-background/40 p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                {detail.bodyText}
              </pre>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
                No plain-text content is stored for this message
                {detail?.contentFetchedAt
                  ? " (the message was fetched but had no text part)."
                  : " (content was never fetched)."}
              </p>
            )}
            {detail && detail.attachments.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {detail.attachments.length} attachment
                {detail.attachments.length === 1 ? "" : "s"} stored — open the Attachments Explorer
                to verify them.
              </p>
            ) : null}
          </TabsContent>

          <TabsContent value="html">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
                <span className="flex-1">
                  The original HTML is not stored. Fetching it contacts Gmail using the user&apos;s
                  connection and renders it in a sandboxed frame with scripts, forms and remote
                  images disabled.
                </span>
                {message ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={htmlState.status === "loading" || Boolean(htmlState.result?.ok)}
                    onClick={() => void loadHtml(message)}
                  >
                    {htmlState.status === "loading" ? "Fetching…" : "Load HTML from Gmail"}
                  </Button>
                ) : null}
              </div>

              {htmlState.status === "error" ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {htmlState.errorMessage}
                </p>
              ) : null}

              {htmlState.result ? (
                htmlState.result.ok && htmlState.result.html ? (
                  <iframe
                    title="Original message HTML (scripts and remote content blocked)"
                    sandbox=""
                    srcDoc={sandboxDocument(htmlState.result.html)}
                    className="h-[55vh] w-full rounded-lg border border-border/70 bg-white"
                  />
                ) : htmlState.result.ok ? (
                  <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
                    Gmail returned this message without an HTML part.
                  </p>
                ) : (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {htmlState.result.message}
                    {htmlState.result.code ? (
                      <span className="mt-1 block font-mono text-[11px]">
                        Code: {htmlState.result.code}
                      </span>
                    ) : null}
                  </p>
                )
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function MessageExplorer({ userId, result }: MessageExplorerProps) {
  const [selected, setSelected] = React.useState<
    AdminUserMessageListResult["messages"][number] | null
  >(null);
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<AdminUserMessageDetail | null>(null);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  function openMessage(message: AdminUserMessageListResult["messages"][number]) {
    setSelected(message);
    setOpen(true);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/users/${userId}/messages/${message.id}`);
        setDetail(await readJson<AdminUserMessageDetail>(response));
      } catch (error) {
        setDetailError((error as Error).message);
      } finally {
        setLoadingDetail(false);
      }
    })();
  }

  function pageHref(page: number) {
    return page > 1 ? `/admin/users/${userId}?msg_page=${page}` : `/admin/users/${userId}`;
  }

  const start = result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const end = Math.min(result.page * result.pageSize, result.total);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail aria-hidden="true" className="size-4 text-primary" />
          Gmail messages explorer
        </CardTitle>
        <CardDescription>
          Messages stored for this user only. Bodies stay in the read-only database; the original HTML
          is loaded from Gmail on explicit request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No Gmail messages are stored for this account.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                  <th className="px-3 py-2.5 font-semibold">Subject</th>
                  <th className="px-3 py-2.5 font-semibold">Sender</th>
                  <th className="px-3 py-2.5 font-semibold">Recipient</th>
                  <th className="px-3 py-2.5 font-semibold">Received</th>
                  <th className="px-3 py-2.5 font-semibold">Message ID</th>
                  <th className="px-3 py-2.5 font-semibold">Content</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Attachments</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.messages.map((message) => {
                  const badge = contentBadge(message);
                  return (
                    <tr key={message.id} className="border-b border-border/40 last:border-0">
                      <td className="max-w-[240px] px-3 py-2.5">
                        <p className="truncate font-medium" title={message.subject}>
                          {message.subject || "(no subject)"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {message.serviceName} · {message.messageCategory}
                        </p>
                      </td>
                      <td className="max-w-[200px] px-3 py-2.5">
                        <span className="block truncate text-xs" title={message.sender}>
                          {message.sender || "—"}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-3 py-2.5">
                        <span className="block truncate text-xs" title={message.recipient}>
                          {message.recipient || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {message.receivedAt ? formatDateTime(message.receivedAt) : "Unknown"}
                      </td>
                      <td className="max-w-[150px] px-3 py-2.5">
                        <span
                          className="block truncate font-mono text-[11px] text-muted-foreground"
                          title={message.gmailMessageId}
                        >
                          {message.gmailMessageId}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {formatCount(message.attachmentCount)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openMessage(message)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {result.total > 0
              ? `Showing ${formatCount(start)}–${formatCount(end)} of ${formatCount(result.total)} messages`
              : "No messages"}
            {result.total > 0 ? ` · ${result.pageSize} per page` : ""}
          </p>
          {result.total > 0 ? (
            <div className="flex items-center gap-2">
              {result.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(result.page - 1)}>
                    <ChevronLeft aria-hidden="true" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft aria-hidden="true" />
                  Previous
                </Button>
              )}
              <span className="font-mono text-[11px] text-muted-foreground">
                Page {result.page} / {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(result.page + 1)}>
                    Next
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>

      <MessageDetailDialog
        key={selected?.id ?? "empty"}
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        message={selected}
        detail={detail}
        detailError={detailError}
        loadingDetail={loadingDetail}
      />
    </Card>
  );
}
