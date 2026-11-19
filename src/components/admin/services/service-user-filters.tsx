import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildServiceHref, type ServiceUserSort } from "@/lib/admin/services";

const selectClassName =
  "h-10 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground";

const SORT_LABELS: Record<ServiceUserSort, string> = {
  last_seen: "Last seen (newest)",
  first_seen: "First seen (oldest)",
  notifications: "Most notifications",
  name: "Name (A-Z)",
  gmail_status: "Gmail mailbox status",
};

export function ServiceUserFilters({
  serviceName,
  query,
  sort,
  hasFilters,
}: {
  serviceName: string;
  query: string;
  sort: ServiceUserSort;
  hasFilters: boolean;
}) {
  const base = buildServiceHref(serviceName);

  return (
    <form
      role="search"
      action={base}
      className="grid gap-2 rounded-xl border border-border/70 bg-card/40 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_auto]"
    >
      <label className="relative block">
        <span className="sr-only">Search users for this service</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search display name or user reference…"
          className="pl-9"
        />
      </label>

      <label>
        <span className="sr-only">Sort users</span>
        <select name="sort" defaultValue={sort} className={`${selectClassName} w-full`}>
          {(Object.keys(SORT_LABELS) as ServiceUserSort[]).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost">
            <Link href={base}>Reset</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
