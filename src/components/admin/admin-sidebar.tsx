"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { adminNavSections, isAdminNavActive } from "@/config/admin-navigation";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col overflow-hidden border-r border-border/60 bg-card/20 lg:flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-radial-glow opacity-60" aria-hidden="true" />
      <div className="relative flex h-16 shrink-0 items-center gap-2 border-b border-border/60 px-5">
        <Logo href="/admin" />
        <Badge variant="outline" className="ml-auto px-2 text-[10px] tracking-widest uppercase">
          Owner
        </Badge>
      </div>

      <ScrollArea className="relative flex-1">
        <nav className="flex flex-col gap-6 px-3 py-5" aria-label="Admin sections">
          {adminNavSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              <p className="px-2 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isAdminNavActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.description}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/12 text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gradient-brand" />
                    ) : null}
                    <Icon
                      className={cn(
                        "size-4",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="relative border-t border-border/60 p-3">
        <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5">
          <p className="flex items-center gap-2 text-xs font-medium">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
            Owner-only console
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Every figure is read live from the production database. No mock data.
          </p>
        </div>
      </div>
    </aside>
  );
}
