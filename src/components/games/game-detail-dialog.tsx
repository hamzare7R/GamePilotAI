import Image from "next/image";
import { Check, Plus } from "lucide-react";

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
import { genreLabels, platformMeta } from "@/config/catalog";
import { formatPlayers, formatReleaseDate, isNewRelease } from "@/lib/catalog";
import type { GameCatalogEntry } from "@/types/catalog";

type GameDetailDialogProps = {
  game: GameCatalogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inLibrary: boolean;
  onToggleLibrary: (game: GameCatalogEntry) => void;
};

export function GameDetailDialog({
  game,
  open,
  onOpenChange,
  inLibrary,
  onToggleLibrary,
}: GameDetailDialogProps) {
  const players = formatPlayers(game?.playersOnline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
        {game ? (
          <>
            <div className="relative h-52 w-full shrink-0 sm:h-60">
              <Image
                src={game.heroUrl ?? game.coverUrl}
                alt={`${game.title} key art`}
                fill
                sizes="(min-width: 640px) 672px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-card via-card/55 to-transparent" />
              <div className="absolute inset-x-5 bottom-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingBadge rating={game.rating} />
                  {isNewRelease(game) ? <Badge variant="blue">New release</Badge> : null}
                  {game.trendingRank ? (
                    <Badge variant="outline" className="bg-black/40">
                      #{game.trendingRank} trending
                    </Badge>
                  ) : null}
                </div>
                <DialogTitle className="font-display text-2xl font-semibold sm:text-3xl">
                  {game.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-foreground/70">
                  {game.tagline}
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-5 px-5 pb-5">
              <p className="text-sm leading-relaxed text-muted-foreground">{game.description}</p>

              <div className="flex flex-wrap gap-2">
                {game.genres.map((genre) => (
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
                    {game.platforms.map((platform) => {
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
                          <span className="text-[11px] text-muted-foreground">· {meta.coverage}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <dl className="space-y-2 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Developer</dt>
                    <dd className="text-right font-medium">{game.developer}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Publisher</dt>
                    <dd className="text-right font-medium">{game.publisher}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Release</dt>
                    <dd className="text-right font-medium">{formatReleaseDate(game.releaseDate)}</dd>
                  </div>
                  {players ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground">Playing now</dt>
                      <dd className="text-right font-medium">{players}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Close</Button>
                </DialogClose>
                <Button
                  variant={inLibrary ? "secondary" : "default"}
                  aria-pressed={inLibrary}
                  onClick={() => onToggleLibrary(game)}
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
