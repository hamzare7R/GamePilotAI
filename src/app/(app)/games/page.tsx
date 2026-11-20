import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  CalendarClock,
  Compass,
  Flame,
  Gamepad2,
  LibraryBig,
  LayoutGrid,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { GamesDiscovery } from "@/components/games/games-discovery";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveSessionState } from "@/server/auth/session-state";
import { USER_COOKIE_NAME } from "@/server/auth/user";
import { getCatalogSections } from "@/server/catalog/service";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Games",
  description:
    "Explore a live games database: featured titles, most-added and popular games, upcoming releases, categories, platform filters and instant search.",
};

const jumpLinks = [
  { label: "Platforms", href: "#platforms", icon: Gamepad2 },
  { label: "Categories", href: "#categories", icon: LayoutGrid },
  { label: "Most added", href: "#trending", icon: Flame },
  { label: "Popular", href: "#popular", icon: TrendingUp },
  { label: "Upcoming", href: "#upcoming", icon: Rocket },
  { label: "New releases", href: "#new-releases", icon: CalendarClock },
  { label: "Explore", href: "#explore", icon: Compass },
];

export default async function GamesPage() {
  const [sections, cookieStore] = await Promise.all([getCatalogSections(), cookies()]);
  const session = await resolveSessionState(cookieStore.get(USER_COOKIE_NAME)?.value);

  const hasGames =
    Boolean(sections.featured) ||
    sections.trending.length > 0 ||
    sections.popular.length > 0 ||
    sections.upcoming.length > 0 ||
    sections.recentlyReleased.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Discovery center"
        title="Find your next world"
        description="A launcher-grade view of the games catalog: featured picks, most-added and popular titles, upcoming releases, categories, platform filters and search."
        actions={
          <>
            <Badge
              variant={
                sections.availability === "live"
                  ? "success"
                  : sections.availability === "fallback"
                    ? "destructive"
                    : "outline"
              }
              title={
                sections.availability === "live"
                  ? "Live data from the RAWG games database"
                  : sections.availability === "fallback"
                    ? "Live game data is temporarily unavailable. Showing the demo catalog."
                    : "Live game data is not available. Showing the demo catalog."
              }
            >
              <Sparkles aria-hidden="true" />
              {sections.availability === "live"
                ? "Live · RAWG"
                : sections.availability === "fallback"
                  ? "Demo · live data unavailable"
                  : "Demo catalog"}
            </Badge>
            <Button asChild variant="secondary">
              <Link href="/library">
                <LibraryBig aria-hidden="true" />
                My library
              </Link>
            </Button>
          </>
        }
      />

      <nav aria-label="Discover sections" className="flex flex-wrap items-center gap-1.5">
        {jumpLinks.map((link) => {
          const Icon = link.icon;

          return (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {link.label}
            </a>
          );
        })}
      </nav>

      {hasGames ? (
        <GamesDiscovery sections={sections} authState={session.state} />
      ) : (
        <EmptyState
          icon={Gamepad2}
          title="The catalog is empty"
          description="The games catalog returned no titles. Please try again in a moment."
          action={
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
