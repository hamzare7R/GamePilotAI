"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] segment render failed:", error.digest ?? error.name);
  }, [error]);

  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h1 className="font-display text-lg font-semibold">This section could not be rendered.</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Nothing was changed. Retry the request; if the problem persists, check the server logs
            using the reference below.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">ref: {error.digest}</p>
          ) : null}
        </div>
      </div>
      <Button variant="secondary" className="mt-4" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}
