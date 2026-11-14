import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CustomGameForm } from "@/components/admin/custom-game-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Add custom game",
  robots: { index: false, follow: false },
};

export default function NewCustomGamePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Add a custom game</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts stay private until you publish them into the catalog.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/games">
            <ArrowLeft aria-hidden="true" />
            Back to list
          </Link>
        </Button>
      </div>

      <CustomGameForm mode="create" />
    </div>
  );
}
