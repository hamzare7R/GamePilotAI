"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dashboardNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border/60 bg-card/30 lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border/60 px-5">
        <Logo />
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-6 px-3 py-5" aria-label="Dashboard">
          {dashboardNav.map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              <p className="px-2 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
                    {Icon ? (
                      <Icon
                        className={cn(
                          "size-4",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                    ) : null}
                    <span className="flex-1">{item.title}</span>
                    {item.badge ? (
                      <Badge variant="blue" className="px-1.5 py-0 text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-3">
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-brand-soft p-4">
          <Sparkles className="size-4 text-primary" />
          <p className="mt-2 text-sm font-medium">AI Coach is warming up</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Wire your library to unlock personalized coaching.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link href="/coach">Explore coach</Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
