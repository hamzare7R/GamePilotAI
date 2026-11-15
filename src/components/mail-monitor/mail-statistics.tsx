import { BellRing, Layers, ShieldCheck, Timer } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

function formatRelative(value: Date | null) {
  if (!value) return "No activity yet";
  const diffMs = Date.now() - value.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function MailStatistics({
  summary,
}: {
  summary: {
    totalNotifications: number;
    detectedServices: number;
    securityNotifications: number;
    lastActivity: Date | null;
  };
}) {
  const items = [
    {
      label: "Total notifications",
      value: String(summary.totalNotifications),
      hint: "Metadata records kept",
      icon: BellRing,
      tone: "text-primary",
    },
    {
      label: "Detected services",
      value: String(summary.detectedServices),
      hint: "From sender domains",
      icon: Layers,
      tone: "text-brand-cyan",
    },
    {
      label: "Security notifications",
      value: String(summary.securityNotifications),
      hint: "Alerts, logins, passwords",
      icon: ShieldCheck,
      tone: "text-emerald-300",
    },
    {
      label: "Last activity",
      value: summary.lastActivity ? formatRelative(summary.lastActivity) : "—",
      hint: "Most recent detection",
      icon: Timer,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="gap-3 py-5">
            <CardHeader className="flex flex-row items-center justify-between px-5">
              <CardDescription className="text-[11px] font-semibold tracking-widest uppercase">
                {item.label}
              </CardDescription>
              <Icon className={`size-4 ${item.tone}`} aria-hidden="true" />
            </CardHeader>
            <CardContent className="px-5">
              <p className="font-display text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
