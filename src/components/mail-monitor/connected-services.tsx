import { Gamepad2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_LABELS, type ServiceKey } from "@/lib/gmail/service-map";

function labelFor(serviceName: string) {
  return SERVICE_LABELS[serviceName as ServiceKey] ?? "Other services";
}

function formatDate(value: Date) {
  return value.toLocaleDateString();
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
      <CardHeader>
        <CardTitle>Connected services</CardTitle>
        <CardDescription>Recognised from verified sender domains, never from sender display names.</CardDescription>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No services detected yet. Once notifications arrive in your inbox, they will appear here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {services.map((service) => (
              <li
                key={service.serviceName}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Gamepad2 className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{labelFor(service.serviceName)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    First seen {formatDate(service.firstDetectedAt)} · last {formatDate(service.lastDetectedAt)}
                  </p>
                </div>
                <Badge variant="outline">{service.notificationCount}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
