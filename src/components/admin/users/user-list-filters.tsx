import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminGmailFilter,
  AdminSessionFilter,
  AdminUserSort,
} from "@/server/admin/users";

type UserListFiltersProps = {
  query: string;
  session: AdminSessionFilter;
  gmail: AdminGmailFilter;
  sort: AdminUserSort;
  hasFilters: boolean;
};

const selectClassName =
  "h-10 rounded-lg border border-input bg-background/60 px-3 text-sm text-foreground";

export function UserListFilters({
  query,
  session,
  gmail,
  sort,
  hasFilters,
}: UserListFiltersProps) {
  return (
    <form
      role="search"
      action="/admin/users"
      className="grid gap-2 rounded-xl border border-border/70 bg-card/40 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      <div className="relative">
        <label htmlFor="user-search" className="sr-only">
          Search users by email or display name
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="user-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search email or display name…"
          className="pl-9"
        />
      </div>

      <label className="sr-only" htmlFor="user-session-filter">
        Session status
      </label>
      <select
        id="user-session-filter"
        name="session"
        defaultValue={session}
        className={selectClassName}
      >
        <option value="all">All sessions</option>
        <option value="active">Valid session</option>
        <option value="expired">Expired sessions only</option>
        <option value="none">Never signed in</option>
      </select>

      <label className="sr-only" htmlFor="user-gmail-filter">
        Gmail connection status
      </label>
      <select
        id="user-gmail-filter"
        name="gmail"
        defaultValue={gmail}
        className={selectClassName}
      >
        <option value="all">All Gmail states</option>
        <option value="connected">Gmail connected</option>
        <option value="error">Gmail error</option>
        <option value="revoked">Gmail revoked</option>
        <option value="none">No Gmail linked</option>
      </select>

      <label className="sr-only" htmlFor="user-sort">
        Sort users
      </label>
      <select id="user-sort" name="sort" defaultValue={sort} className={selectClassName}>
        <option value="newest">Newest accounts</option>
        <option value="oldest">Oldest accounts</option>
        <option value="last_login">Last login</option>
        <option value="name">Name A–Z</option>
        <option value="notifications">Most notifications</option>
        <option value="storage">Most storage</option>
      </select>

      <div className="flex items-center gap-1.5">
        <Button type="submit" variant="secondary" className="flex-1 xl:flex-none">
          Apply
        </Button>
        {hasFilters ? (
          <Button asChild variant="ghost">
            <Link href="/admin/users">Reset</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
