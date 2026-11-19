import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ServiceSort } from "@/lib/admin/services";

const selectClassName =
  "h-10 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground";

const SORT_LABELS: Record<ServiceSort, string> = {
  users: "Most users",
  notifications: "Most notifications",
  first_seen: "First seen (oldest)",
  last_seen: "Last seen (newest)",
  active_gmail: "Active Gmail users",
  name: "Name (A-Z)",
};

export function ServiceListFilters({
  query,
  sort,
  hasFilters,
}: {
  query: string;
  sort: ServiceSort;
  hasFilters: boolean;
}) {
  return (
    <form
      role="search"
      action="/admin/services"
      className="grid gap-2 rounded-xl border border-border/70 bg-card/40 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_auto]"
    >
      <label className="relative block">
        <span className="sr-only">Search detected services</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by service name or key…"
          className="pl-9"
        />
      </label>

      <label>
        <span className="sr-only">Sort services</span>
        <select name="sort" defaultValue={sort} className={`${selectClassName} w-full`}>
          {(Object.keys(SORT_LABELS) as ServiceSort[]).map((value) => (
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
            <Link href="/admin/services">Reset</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
