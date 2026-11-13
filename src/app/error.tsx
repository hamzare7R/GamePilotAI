"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-radial-glow px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
        Something went off-course
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        An unexpected error interrupted this view. Try again — if it keeps happening, check the
        server logs for the digest below.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">digest: {error.digest}</p>
      ) : null}
      <Button onClick={reset} className="mt-6">
        <RotateCcw />
        Try again
      </Button>
    </div>
  );
}
