import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { CustomGamesTable } from "@/components/admin/custom-games-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/admin";
import { listCustomGamesForAdmin } from "@/server/custom-games/service";
import {
  CustomGameStoreUnavailableError,
  describeStoreError,
} from "@/server/custom-games/types";
import type { CustomGame, CustomGameStatus, CustomGameStatusFilter } from "@/types/custom-game";

export const metadata: Metadata = {
  title: "Custom games",
  robots: { index: false, follow: false },
};

const STATUS_OPTIONS: { value: CustomGameStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

function parseStatus(value: string | undefined): CustomGameStatusFilter {
  if (value === "published" || value === "draft" || value === "archived") {
    return value satisfies CustomGameStatus;
  }
  return "all";
}

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminPage();

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = parseStatus(params.status);

  let games: CustomGame[] = [];
  let loadError: string | null = null;

  try {
    games = await listCustomGamesForAdmin({ search: query, status });
  } catch (error) {
    loadError =
      error instanceof CustomGameStoreUnavailableError
        ? error.message
        : "The custom games store is temporarily unavailable. Check the server logs for details.";
    console.error("[custom-games] admin page failed:", describeStoreError(error));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog management"
        title="Custom games"
        description="Add titles that RAWG does not cover, keep drafts private, and publish them into the unified games catalog."
        actions={
          <Button asChild>
            <Link href="/admin/games/new">
              <Plus aria-hidden="true" />
              Add new game
            </Link>
          </Button>
        }
      />

      <form
        role="search"
        action="/admin/games"
        className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/40 p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <label htmlFor="admin-search" className="sr-only">
            Search custom games
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="admin-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name, slug, developer…"
            className="pl-9"
          />
        </div>
        <label className="sr-only" htmlFor="admin-status">
          Status
        </label>
        <select
          id="admin-status"
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-medium">Could not load custom games.</p>
          <p className="mt-1 text-xs text-destructive/80">{loadError}</p>
        </div>
      ) : (
        <CustomGamesTable games={games} />
      )}

      <p className="text-xs text-muted-foreground">
        {games.length} {games.length === 1 ? "custom entry" : "custom entries"} ·{" "}
        {status === "all" ? "all statuses" : status}
        {query ? ` · matching “${query}”` : ""}
      </p>
    </div>
  );
}
