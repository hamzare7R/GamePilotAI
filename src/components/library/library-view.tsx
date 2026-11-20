"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LibraryBig,
  RefreshCw,
  Search,
  SearchX,
  X,
} from "lucide-react";

import { LibraryEntryCard } from "@/components/library/library-entry-card";
import { LibraryEntryDialog } from "@/components/library/library-entry-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { platformList } from "@/config/catalog";
import { useLibrary, useRemoveFromLibrary } from "@/hooks/api/use-library";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import { libraryStatusLabels, libraryStatusOrder, resolveLibraryLoadError } from "@/lib/library";
import { cn } from "@/lib/utils";
import type { GamePlatform, GameStatus, LibraryEntry } from "@/types/game";

const PAGE_SIZE = 12;

type StatusFilter = GameStatus | "all";
type PlatformFilterValue = GamePlatform | "all";

function ResultsSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-xl border border-border/70 bg-card/40 p-3 sm:gap-4"
        >
          <Skeleton className="aspect-3/4 w-20 shrink-0 rounded-lg sm:w-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/70 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function LibraryView() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilterValue>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeEntry, setActiveEntry] = useState<LibraryEntry | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const normalizedSearch = debouncedSearch.trim();

  const query = useLibrary({
    status: status === "all" ? undefined : status,
    platform: platform === "all" ? undefined : platform,
    search: normalizedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const removeMutation = useRemoveFromLibrary();
  const data = query.data;
  const errorCode = query.error instanceof ApiError ? query.error.code : undefined;
  const loadError = resolveLibraryLoadError(errorCode);
  const hasFilters = status !== "all" || platform !== "all" || normalizedSearch.length > 0;

  const resetFilters = () => {
    setStatus("all");
    setPlatform("all");
    setSearch("");
    setPage(1);
  };

  const handleRemove = (entry: LibraryEntry) => {
    setNotice(null);
    setRemovingId(entry.id);
    removeMutation.mutate(entry.id, {
      onError: (error) =>
        setNotice(
          error instanceof ApiError ? error.message : "The game could not be removed right now.",
        ),
      onSuccess: () => {
        if (data?.items.length === 1 && page > 1) {
          setPage((current) => current - 1);
        }
      },
      onSettled: () => setRemovingId(null),
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4 backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          >
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              {libraryStatusOrder.map((value) => (
                <TabsTrigger key={value} value={value}>
                  {libraryStatusLabels[value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full lg:max-w-sm">
            <label htmlFor="library-search" className="sr-only">
              Search your library
            </label>
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground",
                query.isFetching && "animate-pulse text-primary",
              )}
              aria-hidden="true"
            />
            <Input
              id="library-search"
              type="search"
              value={search}
              autoComplete="off"
              placeholder="Search your library by title…"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="h-10 bg-background/60 pr-9 pl-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
            Platform
          </span>
          <FilterChip
            active={platform === "all"}
            onClick={() => {
              setPlatform("all");
              setPage(1);
            }}
          >
            All platforms
          </FilterChip>
          {platformList.map((item) => (
            <FilterChip
              key={item.id}
              active={platform === item.id}
              onClick={() => {
                setPlatform(item.id);
                setPage(1);
              }}
            >
              <item.icon className={cn("size-3.5", item.accent)} aria-hidden="true" />
              {item.shortLabel}
            </FilterChip>
          ))}
        </div>
      </div>

      {notice ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded-md px-2 py-1 font-medium transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:outline-none"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {query.isPending ? (
        <ResultsSkeleton />
      ) : query.isError ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
        >
          <p className="font-display text-base font-semibold">{loadError.title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{loadError.description}</p>
          {loadError.canRetry ? (
            <Button
              variant="secondary"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={query.isFetching ? "animate-spin" : undefined} aria-hidden="true" />
              {query.isFetching ? "Retrying…" : "Try again"}
            </Button>
          ) : null}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={hasFilters ? SearchX : LibraryBig}
          title={hasFilters ? "No games match these filters" : "Your library is empty — for now"}
          description={
            hasFilters
              ? "Nothing in your library matched the current status, platform or search. Remove a filter and try again."
              : "Browse the discovery center and add games to keep status, platform, progress and playtime in one place."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href="/games">Browse games</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" role="status">
              {query.isFetching
                ? "Updating your library…"
                : `${data.pagination.total.toLocaleString("en-US")} ${
                    data.pagination.total === 1 ? "game" : "games"
                  } in view`}
            </p>
            <Badge variant="outline">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </Badge>
          </div>

          <div aria-busy={query.isFetching} className="grid gap-3 lg:grid-cols-2">
            {data.items.map((entry) => (
              <LibraryEntryCard
                key={entry.id}
                entry={entry}
                onEdit={setActiveEntry}
                onRemove={handleRemove}
                isRemoving={removingId === entry.id}
              />
            ))}
          </div>

          {data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!data.pagination.hasPreviousPage || query.isFetching}
              >
                <ChevronLeft aria-hidden="true" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {data.pagination.page} / {data.pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() =>
                  setPage((current) => Math.min(data.pagination.totalPages, current + 1))
                }
                disabled={!data.pagination.hasNextPage || query.isFetching}
              >
                Next
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </>
      )}

      {activeEntry ? (
        <LibraryEntryDialog
          key={activeEntry.id}
          entry={activeEntry}
          open
          onOpenChange={(next) => {
            if (!next) setActiveEntry(null);
          }}
        />
      ) : null}
    </div>
  );
}
