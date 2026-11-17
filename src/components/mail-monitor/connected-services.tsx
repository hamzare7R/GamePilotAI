"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppWindow, Gamepad2, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SERVICE_LABELS, type ServiceKey } from "@/lib/gmail/service-map";

const GAME_SERVICES = new Set<ServiceKey>([
  "steam", "epic", "playstation", "xbox", "riot", "garena", "pubg", "moonton",
  "supercell", "roblox", "minecraft", "activision", "ea", "ubisoft", "blizzard",
  "nintendo",
]);

type ConnectedService = {
  serviceName: string;
  notificationCount: number;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
};

function labelFor(serviceName: string) {
  return SERVICE_LABELS[serviceName as ServiceKey] ?? "Other services";
}

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

function ServiceGrid({
  services,
  kind,
}: {
  services: ConnectedService[];
  kind: "apps" | "games";
}) {
  const emptyTitle = kind === "games" ? "No games detected yet" : "No apps detected yet";
  const emptyDescription =
    kind === "games"
      ? "Supported PC and mobile games will appear here when an account notification is detected."
      : "Connected websites and apps will appear here when an account notification is detected.";

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
        {kind === "games" ? (
          <Gamepad2 className="size-8 text-muted-foreground" aria-hidden="true" />
        ) : (
          <AppWindow className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
        <p className="mt-3 text-sm font-medium">{emptyTitle}</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      {services.map((service) => (
        <li key={service.serviceName}>
          <Link
            href={`/mail-monitor/services/${encodeURIComponent(service.serviceName)}`}
            aria-label={`View ${labelFor(service.serviceName)} activity`}
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              {kind === "games" ? (
                <Gamepad2 className="size-5" aria-hidden="true" />
              ) : (
                <AppWindow className="size-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{labelFor(service.serviceName)}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Last detected {formatDate(service.lastDetectedAt)}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {service.notificationCount}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ConnectedServices({ services }: { services: ConnectedService[] }) {
  const { apps, games } = useMemo(() => {
    const games = services.filter((service) => GAME_SERVICES.has(service.serviceName as ServiceKey));
    const apps = services.filter((service) => !GAME_SERVICES.has(service.serviceName as ServiceKey));
    return { apps, games };
  }, [services]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="size-4 text-primary" aria-hidden="true" />
            Connected services
          </CardTitle>
          <CardDescription>Switch between recognised apps and gaming accounts.</CardDescription>
        </div>
        <Badge variant="outline">{services.length} detected</Badge>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="apps" className="gap-4">
          <TabsList className="grid h-11 w-full grid-cols-2 sm:w-[340px]">
            <TabsTrigger value="apps" className="gap-2">
              <AppWindow aria-hidden="true" />
              Apps
              <Badge variant="secondary" className="ml-1">{apps.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 aria-hidden="true" />
              Games
              <Badge variant="secondary" className="ml-1">{games.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="apps">
            <ServiceGrid services={apps} kind="apps" />
          </TabsContent>
          <TabsContent value="games">
            <ServiceGrid services={games} kind="games" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
