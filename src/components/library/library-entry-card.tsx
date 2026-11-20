"use client";

import { useState } from "react";
import {
  Check,
  Clock3,
  Gamepad2,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import { GameImage } from "@/components/media/game-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { platformMeta } from "@/config/catalog";
import { formatPlaytime, libraryStatusLabels } from "@/lib/library";
import { cn } from "@/lib/utils";
import type { GameStatus, LibraryEntry } from "@/types/game";

const statusVariants: Record<GameStatus, "default" | "success" | "outline" | "destructive"> = {
  playing: "default",
  completed: "success",
  backlog: "outline",
  dropped: "destructive",
};

type LibraryEntryCardProps = {
  entry: LibraryEntry;
  onEdit: (entry: LibraryEntry) => void;
  onRemove: (entry: LibraryEntry) => void;
  isRemoving: boolean;
};

export function LibraryEntryCard({ entry, onEdit, onRemove, isRemoving }: LibraryEntryCardProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const platform = entry.platform ? platformMeta[entry.platform] : null;
  const PlatformIcon = platform?.icon ?? Gamepad2;

  return (
    <article className="flex gap-3 rounded-xl border border-border/70 bg-card/50 p-3 backdrop-blur-md transition-colors hover:border-primary/30 sm:gap-4">
      <div className="relative aspect-3/4 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card sm:w-24">
        <GameImage
          src={entry.gameCoverUrl}
          alt={`${entry.gameTitle} cover art`}
          sizes="96px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-semibold">{entry.gameTitle}</h3>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PlatformIcon className={cn("size-3.5", platform?.accent)} aria-hidden="true" />
              {platform?.label ?? "Platform not set"}
            </p>
          </div>
          <Badge variant={statusVariants[entry.status]}>{libraryStatusLabels[entry.status]}</Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-medium text-foreground/80">{entry.progress}%</span>
          </div>
          <Progress value={entry.progress} aria-label={`${entry.gameTitle} progress`} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {formatPlaytime(entry.playtimeMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5" aria-hidden="true" />
            Added {new Date(entry.addedAt).toLocaleDateString("en-US")}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onEdit(entry)}
            disabled={isRemoving}
          >
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          {confirmingRemove ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onRemove(entry)}
                disabled={isRemoving}
              >
                {isRemoving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Confirm
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmingRemove(false)}
                disabled={isRemoving}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingRemove(true)}
              disabled={isRemoving}
              aria-label={`Remove ${entry.gameTitle} from your library`}
            >
              <Trash2 aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
