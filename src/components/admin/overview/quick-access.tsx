import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";

const shortcuts = [
  {
    title: "Users",
    href: "/admin/users",
    description: "Account directory and session activity.",
  },
  {
    title: "Database Monitor",
    href: "/admin/database",
    description: "Neon latency and table-level signals.",
  },
  {
    title: "Mail Monitor",
    href: "/admin/mail-monitor",
    description: "Gmail sync health and service detection.",
  },
  {
    title: "Connected Services",
    href: "/admin/services",
    description: "Services detected across connected inboxes.",
  },
  {
    title: "System Logs",
    href: "/admin/logs",
    description: "Sync events and failure codes.",
  },
  {
    title: "Storage",
    href: "/admin/storage",
    description: "Messages and attachments retained in Neon.",
  },
];

export function QuickAccess() {
  return (
    <section aria-label="Quick access" className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold">Quick access</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Jump into the owner console sections you will use most.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((shortcut) => (
          <Card key={shortcut.href} className="gap-0 py-0 transition-colors hover:border-primary/30">
            <Link href={shortcut.href} className="group flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium transition-colors group-hover:text-primary">
                  {shortcut.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {shortcut.description}
                </p>
              </div>
              <ArrowUpRight
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
