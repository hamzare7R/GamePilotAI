"use client";

import Image from "next/image";
import { Check, Loader2, Plus, RefreshCw } from "lucide-react";

import { RatingBadge } from "@/components/games/rating-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { genreLabels, platformMeta } from "@/config/catalog";
import { useGameDetail } from "@/hooks/api/use-game-detail";
import { formatPlayers, formatReleaseDate, isNewRelease } from "@/lib/catalog";
import type { GameCatalogEntry, GameDetailResult } from "@/types/catalog";

type GameDetailDialogProps = {
  game: GameCatalogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inLibrary: boolean;
  onToggleLibrary: (game: GameCatalogEntry) => void;
  onSelectGame?: (game: GameCatalogEntry) => void;
  /** Lets the admin preview render an unpublished entry without fetching it. */
  detailOverride?: GameDetailResult | null;
};

export function GameDetailDialog({
  game,
  open,
  onOpenChange,
  inLibrary,
  onToggleLibrary,
  onSelectGame,
  detailOverride,
}: GameDetailDialogProps) {
  const detailQuery = useGameDetail(game?.id, open && !detailOverride);
  const detail = detailOverride?.game ?? detailQuery.data?.game ?? game;
  const similar = detailOverride?.similar ?? detailQuery.data?.similar ?? [];
  const players = formatPlayers(detail?.playersOnline);
  const isLoadingDetail = !detailOverride && detailQuery.isPending && Boolean(game);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
        {detail ? (
          <>
            <div className="relative h-52 w-full shrink-0 sm:h-60">
              <Image
                src={detail.heroUrl ?? detail.coverUrl}
                alt={`${detail.title} key art`}
                fill
                sizes="(min-width: 640px) 672px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-card via-card/55 to-transparent" />
              <div className="absolute inset-x-5 bottom-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingBadge rating={detail.rating} />
                  {detail.source === "custom" ? (
                    <Badge variant="success">Custom entry</Badge>
                  ) : null}
                  {isNewRelease(detail) ? <Badge variant="blue">New release</Badge> : null}
                  {detail.trendingRank ? (
                    <Badge variant="outline" className="bg-black/40">
                      #{detail.trendingRank} trending
                    </Badge>
                  ) : null}
                </div>
                <DialogTitle className="font-display text-2xl font-semibold sm:text-3xl">
                  {detail.title}
                </DialogTitle>
                <DialogDescription className="line-clamp-2 text-sm text-foreground/70">
                  {detail.tagline}
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-5 px-5 pb-5">
              {detailQuery.isError ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <span className="flex-1">Couldn&apos;t load the full details for this game.</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void detailQuery.refetch()}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RefreshCw aria-hidden="true" />
                    Retry
                  </Button>
                </div>
              ) : null}

              {detail.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
              ) : isLoadingDetail ? (
                <div className="space-y-2" aria-hidden="true">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-11/12" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description is available for this title yet.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {detail.genres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genreLabels[genre]}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-4 rounded-xl border border-border/70 bg-background/40 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Available on
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {detail.platforms.map((platform) => {
                      const meta = platformMeta[platform];
                      const Icon = meta.icon;

                      return (
                        <li
                          key={platform}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                        >
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <Icon className={`size-4 ${meta.accent}`} aria-hidden="true" />
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            · {meta.coverage}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <dl className="space-y-2 text-xs">
                  {detail.developer ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Developer</dt>
                      <dd className="text-right font-medium">{detail.developer}</dd>
                    </div>
                  ) : null}
                  {detail.publisher ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Publisher</dt>
                      <dd className="text-right font-medium">{detail.publisher}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Release</dt>
                    <dd className="text-right font-medium">
                      {formatReleaseDate(detail.releaseDate)}
                    </dd>
                  </div>
                  {players ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Playing now</dt>
                      <dd className="text-right font-medium">{players}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="space-y-3 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold">More like this</h3>
                  {detailQuery.isFetching && !isLoadingDetail ? (
                    <Loader2
                      className="size-3.5 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>

                {isLoadingDetail ? (
                  <div className="grid grid-cols-3 gap-2.5" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="space-y-1.5">
                        <Skeleton className="aspect-3/4 w-full rounded-lg" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ))}
                  </div>
                ) : similar.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {similar.map((similarGame) => (
                      <button
                        key={similarGame.id}
                        type="button"
                        onClick={() => onSelectGame?.(similarGame)}
                        className="group text-left focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                      >
                        <span className="relative block aspect-3/4 overflow-hidden rounded-lg border border-border/70 bg-card">
                          <Image
                            src={similarGame.coverUrl}
                            alt={`${similarGame.title} cover art`}
                            fill
                            sizes="(min-width: 640px) 140px, 30vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                          <RatingBadge
                            rating={similarGame.rating}
                            className="absolute top-1.5 left-1.5"
                          />
                        </span>
                        <span className="mt-1.5 block truncate text-xs font-medium">
                          {similarGame.title}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {similarGame.releaseDate?.slice(0, 4) ?? "TBA"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No similar games found for this title.
                  </p>
                )}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Close</Button>
                </DialogClose>
                <Button
                  variant={inLibrary ? "secondary" : "default"}
                  aria-pressed={inLibrary}
                  onClick={() => onToggleLibrary(detail)}
                >
                  {inLibrary ? (
                    <>
                      <Check aria-hidden="true" />
                      In your library
                    </>
                  ) : (
                    <>
                      <Plus aria-hidden="true" />
                      Add to library
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
