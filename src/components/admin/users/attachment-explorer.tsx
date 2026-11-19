"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Eye, HardDriveDownload, Paperclip } from "lucide-react";

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
import { formatBytes, formatCount, formatDateTime } from "@/lib/format";
import type { AdminUserAttachmentListResult } from "@/server/admin/users";

const PREVIEW_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

type AttachmentItem = AdminUserAttachmentListResult["attachments"][number];

type VerifyState = { status: "match" | "mismatch" | "error"; message: string };

function attachmentUrl(userId: string, attachmentId: string) {
  return `/api/admin/users/${userId}/attachments/${attachmentId}`;
}

export function AttachmentExplorer({
  userId,
  result,
}: {
  userId: string;
  result: AdminUserAttachmentListResult;
}) {
  const [selected, setSelected] = React.useState<AttachmentItem | null>(null);
  const [open, setOpen] = React.useState(false);
  const [verifyStates, setVerifyStates] = React.useState<Record<string, VerifyState>>({});
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set());

  async function verifyOne(attachment: AttachmentItem) {
    setBusyIds((current) => new Set(current).add(attachment.id));
    try {
      const response = await fetch(attachmentUrl(userId, attachment.id));
      if (!response.ok) {
        let message = "The attachment could not be read from Neon.";
        try {
          const payload = (await response.json()) as { error?: { message?: string } };
          message = payload.error?.message || message;
        } catch {
          // Binary or empty error body; keep the generic message.
        }
        setVerifyStates((current) => ({
          ...current,
          [attachment.id]: { status: "error", message },
        }));
        return;
      }

      const blob = await response.blob();
      const recorded = Number(response.headers.get("x-recorded-size"));
      const actual = Number(response.headers.get("x-actual-size") ?? blob.size);
      const ok = Number.isFinite(recorded) && recorded === actual;
      setVerifyStates((current) => ({
        ...current,
        [attachment.id]: {
          status: ok ? "match" : "mismatch",
          message: ok
            ? `Retrieved ${formatBytes(actual)} — matches recorded size.`
            : `Mismatch: recorded ${Number.isFinite(recorded) ? formatBytes(recorded) : "unknown"}, retrieved ${formatBytes(actual)}.`,
        },
      }));
    } catch {
      setVerifyStates((current) => ({
        ...current,
        [attachment.id]: { status: "error", message: "The retrieval request failed." },
      }));
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(attachment.id);
        return next;
      });
    }
  }

  async function verifyPage() {
    for (const attachment of result.attachments) {
      // Sequential on purpose: avoids hammering the database with parallel BYTEA reads.
      await verifyOne(attachment);
    }
  }

  function pageHref(page: number) {
    return page > 1 ? `/admin/users/${userId}?att_page=${page}` : `/admin/users/${userId}`;
  }

  const start = result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const end = Math.min(result.page * result.pageSize, result.total);
  const selectedIsImage = selected ? PREVIEW_IMAGE_TYPES.has(selected.mimeType) : false;
  const selectedIsPdf = selected ? selected.mimeType === "application/pdf" : false;
  const selectedUrl = selected ? attachmentUrl(userId, selected.id) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip aria-hidden="true" className="size-4 text-brand-cyan" />
          Attachments explorer
        </CardTitle>
        <CardDescription>
          Attachment bytes stored in Neon for this user. Retrieval tests compare the measured BYTEA
          length with the recorded size. Only raster images and PDFs can preview; everything else is
          download-only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.attachments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-background/30 px-3 py-5 text-sm text-muted-foreground">
            No attachments are stored for this account.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[1080px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
                  <th className="px-3 py-2.5 font-semibold">Filename</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Recorded size</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Stored bytes</th>
                  <th className="px-3 py-2.5 font-semibold">Parent message</th>
                  <th className="px-3 py-2.5 font-semibold">Storage check</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.attachments.map((attachment) => {
                  const verify = verifyStates[attachment.id];
                  const busy = busyIds.has(attachment.id);
                  const matches = attachment.byteSize === attachment.actualBytes;
                  return (
                    <tr key={attachment.id} className="border-b border-border/40 last:border-0">
                      <td className="max-w-[220px] px-3 py-2.5">
                        <span className="block truncate font-medium" title={attachment.filename}>
                          {attachment.filename || "(unnamed)"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {attachment.mimeType || "application/octet-stream"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[11px]">
                        {formatBytes(attachment.byteSize)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge variant={matches ? "success" : "destructive"}>
                          {formatBytes(attachment.actualBytes)}
                        </Badge>
                      </td>
                      <td className="max-w-[240px] px-3 py-2.5">
                        <span
                          className="block truncate text-xs"
                          title={`${attachment.parentSubject} · ${attachment.parentReceivedAt ? formatDateTime(attachment.parentReceivedAt) : "unknown date"}`}
                        >
                          {attachment.parentSubject || "(no subject)"}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                          {attachment.parentReceivedAt
                            ? formatDateTime(attachment.parentReceivedAt)
                            : "Unknown date"}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-3 py-2.5">
                        {verify ? (
                          <span
                            className={
                              verify.status === "match"
                                ? "text-xs text-emerald-300"
                                : verify.status === "mismatch"
                                  ? "text-xs text-destructive"
                                  : "text-xs text-muted-foreground"
                            }
                          >
                            {verify.message}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not tested yet</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void verifyOne(attachment)}
                          >
                            <HardDriveDownload aria-hidden="true" />
                            Verify
                          </Button>
                          {PREVIEW_IMAGE_TYPES.has(attachment.mimeType) ||
                          attachment.mimeType === "application/pdf" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelected(attachment);
                                setOpen(true);
                              }}
                            >
                              <Eye aria-hidden="true" />
                              Preview
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="secondary">
                            <a
                              href={attachmentUrl(userId, attachment.id)}
                              download={attachment.filename || "attachment"}
                            >
                              <Download aria-hidden="true" />
                              Download
                            </a>
                          </Button>
                        </div>
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
              ? `Showing ${formatCount(start)}–${formatCount(end)} of ${formatCount(result.total)} attachments · ${result.pageSize} per page`
              : "No attachments"}
          </p>
          <div className="flex items-center gap-2">
            {result.attachments.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyIds.size > 0}
                onClick={() => void verifyPage()}
              >
                <HardDriveDownload aria-hidden="true" />
                {busyIds.size > 0 ? "Verifying…" : "Verify this page"}
              </Button>
            ) : null}
            {result.total > 0 ? (
              <>
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
              </>
            ) : null}
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{selected?.filename || "Attachment"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.mimeType} · recorded ${formatBytes(selected.byteSize)} · stored ${formatBytes(selected.actualBytes)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && selectedIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- sandboxed same-origin byte stream, not a static asset
            <img
              src={selectedUrl}
              alt={selected.filename}
              className="mx-auto max-h-[70vh] w-auto rounded-lg border border-border/70 bg-white object-contain"
            />
          ) : selected && selectedIsPdf ? (
            <iframe
              title={selected.filename}
              src={selectedUrl}
              className="h-[70vh] w-full rounded-lg border border-border/70 bg-white"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This file type cannot be previewed. Use Download to inspect it outside the owner
              console.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
