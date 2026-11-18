"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { adminNavSections, isAdminNavActive } from "@/config/admin-navigation";
import { cn } from "@/lib/utils";

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <details className="group relative lg:hidden">
      <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Menu className="size-4" aria-hidden="true" />
        <span className="sr-only">Open admin navigation</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/80 bg-card p-2 shadow-glow-purple">
        {adminNavSections.map((section) => (
          <div key={section.title} className="py-1">
            <p className="px-2 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isAdminNavActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/12 text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-primary" : "")} aria-hidden="true" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </details>
  );
}
