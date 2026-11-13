import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Profile, connected platforms, notification preferences and appearance."
      />

      <EmptyState
        icon={Settings}
        title="Settings surface is reserved"
        description="The account and preference types are in place. Build the forms here once authentication and the player API are connected."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
