"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Save } from "lucide-react";

import { ImageUrlField } from "@/components/admin/image-url-field";
import { ScreenshotEditor } from "@/components/admin/screenshot-editor";
import { GameDetailDialog } from "@/components/games/game-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { genreIds, genreLabels, platformList } from "@/config/catalog";
import { ApiError, apiClient } from "@/lib/api/client";
import { customGameToCatalogEntry, slugifyGameName } from "@/lib/custom-game";
import type { CustomGame, CustomGameStatus } from "@/types/custom-game";
import type { GameGenre, GamePlatform } from "@/types/game";

type FormState = {
  name: string;
  slug: string;
  description: string;
  coverUrl: string;
  heroUrl: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  rating: string;
  genres: GameGenre[];
  platforms: GamePlatform[];
  websiteUrl: string;
  trailerUrl: string;
  screenshots: string[];
  status: CustomGameStatus;
};

function initialState(game?: CustomGame): FormState {
  return {
    name: game?.name ?? "",
    slug: game?.slug ?? "",
    description: game?.description ?? "",
    coverUrl: game?.coverUrl ?? "",
    heroUrl: game?.heroUrl ?? "",
    developer: game?.developer ?? "",
    publisher: game?.publisher ?? "",
    releaseDate: game?.releaseDate ?? "",
    rating: game?.rating !== undefined ? String(game.rating) : "",
    genres: game?.genres ?? [],
    platforms: game?.platforms ?? [],
    websiteUrl: game?.websiteUrl ?? "",
    trailerUrl: game?.trailerUrl ?? "",
    screenshots: game ? [...game.screenshots] : [],
    status: game?.status ?? "draft",
  };
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

function issueMessages(details: unknown) {
  if (!Array.isArray(details)) return [];
  return details
    .map((issue) =>
      issue && typeof issue === "object" && "message" in issue
        ? String((issue as { message: unknown }).message)
        : null,
    )
    .filter((message): message is string => Boolean(message))
    .slice(0, 4);
}

export function CustomGameForm({ mode, game }: { mode: "create" | "edit"; game?: CustomGame }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(game));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const previewEntry = useMemo(
    () =>
      customGameToCatalogEntry({
        id: game?.id ?? "custom-preview",
        source: "custom",
        createdAt: game?.createdAt ?? new Date().toISOString(),
        updatedAt: game?.updatedAt ?? new Date().toISOString(),
        slug: form.slug || slugifyGameName(form.name) || "preview",
        name: form.name || "Untitled game",
        description: form.description,
        coverUrl: form.coverUrl,
        heroUrl: form.heroUrl,
        developer: form.developer,
        publisher: form.publisher,
        releaseDate: form.releaseDate || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
        genres: form.genres,
        platforms: form.platforms,
        websiteUrl: form.websiteUrl,
        trailerUrl: form.trailerUrl,
        screenshots: form.screenshots,
        status: form.status,
      }),
    [form, game],
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setIssues([]);

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim(),
      coverUrl: form.coverUrl.trim(),
      heroUrl: form.heroUrl.trim(),
      developer: form.developer.trim(),
      publisher: form.publisher.trim(),
      releaseDate: form.releaseDate || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      genres: form.genres,
      platforms: form.platforms,
      websiteUrl: form.websiteUrl.trim(),
      trailerUrl: form.trailerUrl.trim(),
      screenshots: form.screenshots,
      status: form.status,
    };

    try {
      if (mode === "edit" && game) {
        await apiClient.patch(`/admin/games/${game.id}`, payload);
      } else {
        await apiClient.post("/admin/games", payload);
      }
      router.push("/admin/games");
      router.refresh();
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setIssues(issueMessages(cause.details));
      } else {
        setError("Saving failed. Please retry.");
      }
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="game-name">Name *</Label>
            <Input
              id="game-name"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-slug">Slug</Label>
            <Input
              id="game-slug"
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
              placeholder={slugifyGameName(form.name) || "auto-generated"}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="game-description">Description</Label>
            <Textarea
              id="game-description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              rows={5}
              maxLength={6000}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-developer">Developer</Label>
            <Input
              id="game-developer"
              value={form.developer}
              onChange={(event) => update("developer", event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-publisher">Publisher</Label>
            <Input
              id="game-publisher"
              value={form.publisher}
              onChange={(event) => update("publisher", event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-release">Release date</Label>
            <Input
              id="game-release"
              type="date"
              value={form.releaseDate}
              onChange={(event) => update("releaseDate", event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-rating">Rating (0–10)</Label>
            <Input
              id="game-rating"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.rating}
              onChange={(event) => update("rating", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide">Platforms *</h2>
        <div className="flex flex-wrap gap-2">
          {platformList.map((platform) => {
            const active = form.platforms.includes(platform.id);
            const Icon = platform.icon;

            return (
              <button
                key={platform.id}
                type="button"
                aria-pressed={active}
                onClick={() => update("platforms", toggle(form.platforms, platform.id))}
                className={
                  active
                    ? "inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {platform.label}
              </button>
            );
          })}
        </div>

        <h2 className="font-display pt-2 text-sm font-semibold tracking-wide">Genres</h2>
        <div className="flex flex-wrap gap-2">
          {genreIds.map((genre) => {
            const active = form.genres.includes(genre);

            return (
              <button
                key={genre}
                type="button"
                aria-pressed={active}
                onClick={() => update("genres", toggle(form.genres, genre))}
                className={
                  active
                    ? "rounded-full border border-brand-cyan/50 bg-brand-cyan/10 px-3 py-1.5 text-xs font-medium text-brand-cyan"
                    : "rounded-full border border-border/70 bg-background/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-cyan/30 hover:text-foreground"
                }
              >
                {genreLabels[genre]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/70 bg-card/40 p-4 sm:p-5">
        <h2 className="font-display text-sm font-semibold tracking-wide">Media & links</h2>
        <p className="text-xs text-muted-foreground">
          Paste direct https:// image URLs from anywhere on the web. Previews load immediately; if a
          host blocks external embedding, the storefront falls back to the GamePilot placeholder art.
          No image URLs are generated for you.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <ImageUrlField
            id="game-cover"
            label="Cover image URL"
            value={form.coverUrl}
            onChange={(value) => update("coverUrl", value)}
            aspect="cover"
            help="Portrait artwork (3:4). JPG, PNG, WEBP or GIF over https."
          />
          <ImageUrlField
            id="game-hero"
            label="Background image URL"
            value={form.heroUrl}
            onChange={(value) => update("heroUrl", value)}
            aspect="wide"
            help="Wide key art (16:9) used in the details header. Falls back to the cover."
          />
        </div>

        <div className="grid gap-4 pt-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="game-website">Game website</Label>
            <Input
              id="game-website"
              type="url"
              value={form.websiteUrl}
              onChange={(event) => update("websiteUrl", event.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-trailer">Trailer URL</Label>
            <Input
              id="game-trailer"
              type="url"
              value={form.trailerUrl}
              onChange={(event) => update("trailerUrl", event.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ScreenshotEditor
            value={form.screenshots}
            onChange={(value) => update("screenshots", value)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1.5">
          <Label htmlFor="game-status">Status</Label>
          <select
            id="game-status"
            value={form.status}
            onChange={(event) => update("status", event.target.value as CustomGameStatus)}
            className="h-10 rounded-lg border border-input bg-background/60 px-3 text-sm"
          >
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published (visible in /games)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye aria-hidden="true" />
            Preview
          </Button>
          <Button type="submit" disabled={pending || form.name.trim().length === 0}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create game"}
          </Button>
        </div>
      </section>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">{error}</p>
          {issues.length > 0 ? (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-destructive/80">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Badge variant="outline">Source · custom</Badge>
        <p className="text-xs text-muted-foreground">
          Published entries merge into the RAWG catalog with their source preserved.
        </p>
      </div>

      <GameDetailDialog
        game={previewEntry}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        inLibrary={false}
        onToggleLibrary={() => undefined}
        detailOverride={{ game: previewEntry, similar: [], source: "custom" }}
      />
    </form>
  );
}
