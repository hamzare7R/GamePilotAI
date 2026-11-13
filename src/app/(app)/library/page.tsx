import type { Metadata } from "next";
import Link from "next/link";
import { LibraryBig } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Library",
};

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Collection"
        title="Your library"
        description="Every game you own, with progress, playtime and platform in one place."
        actions={
          <Button asChild variant="secondary">
            <Link href="/games">Add a game</Link>
          </Button>
        }
      />

      <EmptyState
        icon={LibraryBig}
        title="Your library is empty — for now"
        description="Library entries, statuses and progress are fully typed. Once the backend is connected, this view will render your synced collection through libraryService."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
