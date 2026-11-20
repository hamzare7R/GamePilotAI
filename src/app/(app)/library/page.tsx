import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Gamepad2 } from "lucide-react";

import { LibraryDatabaseUnavailable } from "@/components/library/library-database-unavailable";
import { LibraryView } from "@/components/library/library-view";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { resolveSessionState } from "@/server/auth/session-state";
import { USER_COOKIE_NAME } from "@/server/auth/user";

export const metadata: Metadata = {
  title: "Library",
};

export default async function LibraryPage() {
  const token = (await cookies()).get(USER_COOKIE_NAME)?.value;
  const session = await resolveSessionState(token);

  if (session.state === "unauthenticated") redirect("/login?next=/library");

  if (session.state === "unavailable") {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <LibraryDatabaseUnavailable />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Collection"
        title="Your library"
        description="Every game you own, with status, platform, progress and playtime in one place. Only your own entries are ever shown."
        actions={
          <Button asChild variant="secondary">
            <Link href="/games">
              <Gamepad2 aria-hidden="true" />
              Add a game
            </Link>
          </Button>
        }
      />

      <LibraryView />
    </div>
  );
}
