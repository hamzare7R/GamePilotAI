import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  AccountInformationCard,
  ConnectedServicesCard,
  GmailConnectionCard,
  MailStatisticsCard,
  RecentSyncEventsCard,
  SessionActivityCard,
} from "@/components/admin/users/user-detail-sections";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { getAdminUserDetail } from "@/server/admin/users";
import { requireAdminPage } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "User details",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();

  const { id } = await params;
  const user = await getAdminUserDetail(id);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="User details"
        title={user.displayName || user.email}
        description={`${user.email} · registered ${formatDate(user.createdAt)}. Read-only view built from stored account, session and mail data.`}
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
      <RecentSyncEventsCard detail={user} />

      <p className="text-xs text-muted-foreground">
        Password hashes, session token hashes, OAuth tokens and Gmail message content are never read
        or displayed on this page. Account data is read-only in this phase.
      </p>
    </div>
  );
}
