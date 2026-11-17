"use client";

import { Download, Eye, RefreshCw, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ExportNotification = {
  serviceName: string;
  messageCategory: string;
  senderDomain: string;
  receivedAt: Date | null;
  processingStatus: string;
};

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function MailQuickActions({ notifications }: { notifications: ExportNotification[] }) {
  function exportNotifications() {
    const header = ["Service", "Sender domain", "Category", "Received at", "Status"];
    const rows = notifications.map((item) => [
      item.serviceName,
      item.senderDomain,
      item.messageCategory,
      item.receivedAt ? item.receivedAt.toISOString() : "",
      item.processingStatus,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gamepilot-mail-monitor-metadata.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Common tasks, one click away.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <Button type="button" variant="secondary" className="justify-start" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" />
          Refresh dashboard
        </Button>
        <Button asChild variant="secondary" className="justify-start">
          <a href="#recent-notifications">
            <Eye aria-hidden="true" />
            View notifications
          </a>
        </Button>
        <Button variant="secondary" className="justify-start" onClick={exportNotifications} disabled={notifications.length === 0}>
          <Download aria-hidden="true" />
          Export metadata (CSV)
        </Button>
        <Button asChild variant="outline" className="justify-start sm:col-span-3 xl:col-span-1">
          <a href="/settings">
            <Settings2 aria-hidden="true" />
            Account settings
          </a>
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-3 xl:col-span-1">
          Exports contain sender domains, detected services, categories and timestamps only — never email content or verification codes.
        </p>
      </CardContent>
    </Card>
  );
}
