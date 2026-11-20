"use client";

import { Check, LibraryBig, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type LibraryActionButtonProps = {
  inLibrary: boolean;
  available?: boolean;
  unavailable?: boolean;
  statusPending?: boolean;
  busy?: boolean;
  size?: "default" | "sm" | "lg";
  className?: string;
  inLibraryClassName?: string;
  onToggle?: () => void;
};

export function LibraryActionButton({
  inLibrary,
  available = false,
  unavailable = false,
  statusPending = false,
  busy = false,
  size = "default",
  className,
  inLibraryClassName,
  onToggle,
}: LibraryActionButtonProps) {
  if (unavailable) {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled
        title="Your library is temporarily unavailable."
        className={className}
      >
        <LibraryBig aria-hidden="true" />
        Library unavailable
      </Button>
    );
  }

  if (!available) {
    return (
      <Button
        size={size}
        variant="secondary"
        disabled
        title="Saving games to your library is not available yet."
        className={className}
      >
        <LibraryBig aria-hidden="true" />
        Library coming soon
      </Button>
    );
  }

  const pending = statusPending || busy;

  return (
    <Button
      size={size}
      variant={inLibrary ? "secondary" : "default"}
      aria-pressed={statusPending ? undefined : inLibrary}
      aria-busy={pending}
      disabled={pending}
      onClick={onToggle}
      className={inLibrary ? inLibraryClassName : undefined}
    >
      {statusPending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : inLibrary ? (
        <Check aria-hidden="true" />
      ) : (
        <Plus aria-hidden="true" />
      )}
      {statusPending ? "Checking library…" : inLibrary ? "In your library" : "Add to library"}
    </Button>
  );
}
