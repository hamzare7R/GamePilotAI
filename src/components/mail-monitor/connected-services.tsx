"use client";

import { AppWindow, Gamepad2, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_LABELS, type ServiceKey } from "@/lib/gmail/service-map";

function labelFor(serviceName: string) {
  return SERVICE_LABELS[serviceName as ServiceKey] ?? "Other services";
}

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

function ServiceIcon({ serviceName }: { serviceName: string }) {
  const Icon = ["steam", "garena", "pubg", "moonton", "supercell", "roblox", "minecraft", "epic", "riot"].includes(serviceName)
    ? Gamepad2
    : AppWindow;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

export function ConnectedServices({
  services,
}: {
  services: Array<{
    serviceName: string;
    notificationCount: number;
    firstDetectedAt: Date;
    lastDetectedAt: Date;
  }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="size-4 text-primary" aria-hidden="true" />
            Connected apps
          </CardTitle>
          <CardDescription>Services recognised from trusted sender domains.</CardDescription>
        </div>
        <Badge variant="outline">{services.length} detected</Badge>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
            <AppWindow className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">No apps detected yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Once a supported service sends an account notification to your inbox, it will appear here automatically.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {services.map((service) => (
              <li
                key={service.serviceName}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-muted/15 p-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                <ServiceIcon serviceName={service.serviceName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{labelFor(service.serviceName)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Last detected {formatDate(service.lastDetectedAt)}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {service.notificationCount}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
