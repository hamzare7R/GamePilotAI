import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Compass, Flame, Gamepad2, LibraryBig } from "lucide-react";

import { GamesDiscovery } from "@/components/games/games-discovery";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { catalogService } from "@/services/catalog.service";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Browse every platform, follow what's trending and filter the GamePilot catalog by platform and genre.",
};

const jumpLinks = [
  { label: "Platforms", href: "#platforms", icon: Gamepad2 },
  { label: "Trending", href: "#trending", icon: Flame },
  { label: "New releases", href: "#new-releases", icon: CalendarClock },
  { label: "Explore", href: "#explore", icon: Compass },
];

export default async function GamesPage() {
  const [games, featured] = await Promise.all([
    catalogService.listAll(),
    catalogService.featured(),
  ]);

  const highlight = featured ?? games[0];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Discovery center"
        title="Find your next world"
        description="A launcher-grade view of the catalog: browse by platform, see what's trending, filter by genre and dig into any title."
        actions={
          <Button asChild variant="secondary">
            <Link href="/library">
              <LibraryBig aria-hidden="true" />
              My library
            </Link>
          </Button>
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

      {highlight ? (
        <GamesDiscovery games={games} featured={highlight} />
      ) : (
        <EmptyState
          icon={Gamepad2}
          title="The catalog is empty"
          description="Connect a games API or add entries to the local catalog to populate this page."
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
