"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatabaseZap, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LibraryDatabaseUnavailable() {
  const router = useRouter();

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-6 py-16 text-center"
    >
      <DatabaseZap className="size-8 text-amber-200/70" aria-hidden="true" />
      <p className="font-display text-lg font-semibold">Your library is temporarily unavailable</p>
      <p className="max-w-md text-sm text-muted-foreground">
        The library database did not respond. Your saved games are safe, and browsing the catalog
        still works. Try again in a moment.
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Button variant="secondary" onClick={() => router.refresh()}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/games">Browse games</Link>
        </Button>
      </div>
    </div>
  );
}
