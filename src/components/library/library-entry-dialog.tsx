"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { GameImage } from "@/components/media/game-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { platformList } from "@/config/catalog";
import { useUpdateLibraryEntry } from "@/hooks/api/use-library";
import { ApiError } from "@/lib/api/client";
import { formatPlaytime, libraryStatusLabels, libraryStatusOrder } from "@/lib/library";
import { cn } from "@/lib/utils";
import type { GamePlatform, GameStatus, LibraryEntry } from "@/types/game";

type LibraryEntryDialogProps = {
  entry: LibraryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_PLAYTIME_MINUTES = 100_000_000;

export function LibraryEntryDialog({ entry, open, onOpenChange }: LibraryEntryDialogProps) {
  const [status, setStatus] = useState<GameStatus>(entry.status);
  const [platform, setPlatform] = useState<GamePlatform | null>(entry.platform ?? null);
  const [progress, setProgress] = useState(entry.progress);
  const [playtime, setPlaytime] = useState(String(entry.playtimeMinutes));

  const update = useUpdateLibraryEntry();
  const parsedPlaytime = Math.min(
    MAX_PLAYTIME_MINUTES,
    Math.max(0, Number.parseInt(playtime, 10) || 0),
  );
  const mutationError =
    update.error instanceof ApiError
      ? update.error.message
      : update.isError
        ? "The update could not be saved."
        : null;

  const selectStatus = (next: GameStatus) => {
    setStatus(next);
    if (next === "completed") setProgress(100);
  };

  const handleSubmit = () => {
    update.mutate(
      {
        entryId: entry.id,
        input: {
          status,
          platform,
          progress,
          playtimeMinutes: parsedPlaytime,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="relative aspect-3/4 w-14 shrink-0 overflow-hidden rounded-md border border-border/60 bg-card">
              <GameImage
                src={entry.gameCoverUrl}
                alt={`${entry.gameTitle} cover art`}
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">{entry.gameTitle}</DialogTitle>
              <DialogDescription>Update status, platform, progress and playtime.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Status
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {libraryStatusOrder.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => selectStatus(value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                    status === value
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {libraryStatusLabels[value]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Platform <span className="normal-case">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={platform === null}
                onClick={() => setPlatform(null)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                  platform === null
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                None
              </button>
              {platformList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={platform === item.id}
                  onClick={() => setPlatform(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                    platform === item.id
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("size-3.5", item.accent)} aria-hidden="true" />
                  {item.shortLabel}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="library-progress"
                className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
              >
                Progress
              </label>
              <span className="text-xs font-medium text-foreground/80">{progress}%</span>
            </div>
            <Progress id="library-progress" value={progress} aria-label="Completion progress" />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              aria-label="Set completion progress"
              onChange={(event) => setProgress(Number(event.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="library-playtime"
              className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase"
            >
              Playtime (minutes)
            </label>
            <Input
              id="library-playtime"
              type="number"
              min={0}
              max={MAX_PLAYTIME_MINUTES}
              step={5}
              inputMode="numeric"
              value={playtime}
              onChange={(event) => setPlaytime(event.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Stored as whole minutes · {formatPlaytime(parsedPlaytime)}
            </p>
          </div>

          {mutationError ? (
            <p role="alert" className="text-xs text-destructive">
              {mutationError}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
