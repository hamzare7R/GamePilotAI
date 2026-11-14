"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";

import { GameDetailDialog } from "@/components/games/game-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { genreLabels, platformMeta } from "@/config/catalog";
import { ApiError, apiClient } from "@/lib/api/client";
import { customGameToCatalogEntry } from "@/lib/custom-game";
import { customGameStatusLabels, type CustomGame, type CustomGameStatus } from "@/types/custom-game";

const statusVariant: Record<CustomGameStatus, "success" | "outline" | "secondary"> = {
  published: "success",
  draft: "outline",
  archived: "secondary",
};

export function CustomGamesTable({ games }: { games: readonly CustomGame[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CustomGame | null>(null);

  const run = async (id: string, operation: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await operation();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "The action failed. Please retry.");
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (game: CustomGame, status: CustomGameStatus) =>
    run(game.id, () => apiClient.patch(`/admin/games/${game.id}`, { status }));

  const remove = (game: CustomGame) => {
    if (!window.confirm(`Delete “${game.name}”? This cannot be undone.`)) return;
    return run(game.id, () => apiClient.delete(`/admin/games/${game.id}`));
  };

  if (games.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-card/30 px-6 py-12 text-center">
        <p className="font-display text-base font-semibold">No custom games yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a title that is missing from RAWG and it will appear in the catalog once published.
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/admin/games/new">Add the first game</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/30">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-[11px] tracking-widest text-muted-foreground uppercase">
              <th className="px-4 py-3 font-semibold">Game</th>
              <th className="px-4 py-3 font-semibold">Platforms</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const busy = busyId === game.id;

              return (
                <tr key={game.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{game.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      /{game.slug}
                      {game.genres.length > 0
                        ? ` · ${game.genres.map((genre) => genreLabels[genre]).join(", ")}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {game.platforms.map((platform) => (
                        <Badge key={platform} variant="outline">
                          {platformMeta[platform].shortLabel}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[game.status]}>
                      {customGameStatusLabels[game.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(game.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setPreview(game)}>
                        <Eye aria-hidden="true" />
                        Preview
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/games/${game.id}`}>
                          <Pencil aria-hidden="true" />
                          Edit
                        </Link>
                      </Button>
                      {game.status === "published" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setStatus(game, "draft")}
                        >
                          {busy ? <Loader2 className="animate-spin" /> : <EyeOff aria-hidden="true" />}
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setStatus(game, "published")}
                        >
                          {busy ? <Loader2 className="animate-spin" /> : <Eye aria-hidden="true" />}
                          Publish
                        </Button>
                      )}
                      {game.status !== "archived" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setStatus(game, "archived")}
                        >
                          <Archive aria-hidden="true" />
                          Archive
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => remove(game)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <GameDetailDialog
        game={preview ? customGameToCatalogEntry(preview) : null}
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        inLibrary={false}
        onToggleLibrary={() => undefined}
        detailOverride={
          preview
            ? { game: customGameToCatalogEntry(preview), similar: [], source: "custom" }
            : null
        }
      />
    </div>
  );
}
