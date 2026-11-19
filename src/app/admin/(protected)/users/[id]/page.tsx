import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AttachmentExplorer } from "@/components/admin/users/attachment-explorer";
import { MessageExplorer } from "@/components/admin/users/message-explorer";
import { OAuthDiagnosticsCard } from "@/components/admin/users/oauth-diagnostics-card";
import { ReprocessCard } from "@/components/admin/users/reprocess-card";
import {
  AccountInformationCard,
  ConnectedServicesCard,
  GmailConnectionCard,
  MailStatisticsCard,
  RecentSyncEventsCard,
  SessionActivityCard,
  SyncDiagnosticsCard,
} from "@/components/admin/users/user-detail-sections";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getLatestReprocessSummary } from "@/server/admin/reprocess";
import {
  getAdminUserDetail,
  listAdminUserAttachments,
  listAdminUserMessages,
} from "@/server/admin/users";
import { requireAdminPage } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "User details",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg_page?: string; att_page?: string }>;
}) {
  await requireAdminPage();

  const { id } = await params;
  const { msg_page, att_page } = await searchParams;
  const messagePage = Number.parseInt(msg_page ?? "1", 10);
  const attachmentPage = Number.parseInt(att_page ?? "1", 10);

  const [user, messages, attachments, reprocess] = await Promise.all([
    getAdminUserDetail(id),
    listAdminUserMessages({ userId: id, page: Number.isFinite(messagePage) ? messagePage : 1 }),
    listAdminUserAttachments({ userId: id, page: Number.isFinite(attachmentPage) ? attachmentPage : 1 }),
    getLatestReprocessSummary(id),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User details"
        title={user.displayName || user.email}
        description={`${user.email} · registered ${formatDate(user.createdAt)}. Diagnostics view built from stored account, session and mail data.`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/users">
              <ArrowLeft aria-hidden="true" />
              Back to Users
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountInformationCard detail={user} />
        <GmailConnectionCard detail={user} />
      </div>

      <MailStatisticsCard detail={user} />
      <SessionActivityCard detail={user} />
      <ConnectedServicesCard detail={user} />

      <MessageExplorer userId={user.id} result={messages} />
      <AttachmentExplorer userId={user.id} result={attachments} />

      <OAuthDiagnosticsCard userId={user.id} oauth={user.oauth} gmailStatus={user.gmail?.status ?? null} />
      <SyncDiagnosticsCard detail={user} />
      <ReprocessCard
        userId={user.id}
        initialSummary={reprocess}
        canRun={
          user.gmail?.status === "active" &&
          user.oauth.configConfigured &&
          user.oauth.tokenStored
        }
      />
      <RecentSyncEventsCard detail={user} />

      <p className="text-xs text-muted-foreground">
        Password hashes, session token hashes and OAuth tokens are never read or displayed. Message
        text and attachment bytes are shown read-only, scoped to this user: HTML renders only inside a
        sandboxed frame and non-image/PDF attachments are download-only. Everything on this page is
        read-only except the explicit MIME reprocessing action, which only rewrites message text
        fields for this user.
      </p>
    </div>
  );
}
