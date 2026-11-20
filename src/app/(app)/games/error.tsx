"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GamesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center">
      <div
        role="alert"
        className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      >
        <span className="flex size-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-display text-base font-semibold">Games couldn’t load</h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            The games catalog hit an unexpected problem. Please try again in a moment.
          </p>
        </div>
        <Button variant="secondary" onClick={reset}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
}
