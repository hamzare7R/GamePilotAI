"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LibraryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold">Your library could not be loaded</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Something went wrong while rendering the library page. Try again, or head back to the
        dashboard.
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={() => reset()}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
