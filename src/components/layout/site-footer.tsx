import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { footerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>
          <Badge variant="success" className="w-fit gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            All systems operational
          </Badge>
        </div>

        {footerNav.map((section) => (
          <div key={section.title} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {section.title}
            </h3>
            <ul className="flex flex-col gap-2">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Built for players, powered by AI.
          </p>
          <p className="font-mono">v0.1.0 — foundation</p>
        </div>
      </div>
    </footer>
  );
}
