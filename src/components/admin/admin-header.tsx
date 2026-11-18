import Link from "next/link";
import { ArrowUpRight, ChevronRight, ShieldCheck } from "lucide-react";

import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isGmailConfigured } from "@/lib/gmail/env";
import { cn } from "@/lib/utils";
import type { AdminSystemStatus } from "@/server/admin/overview";

type AdminHeaderProps = {
  session: { expiresAt: string } | null;
  systemStatus: AdminSystemStatus;
};

function sessionExpiry(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function AdminHeader({ session, systemStatus }: AdminHeaderProps) {
  const gmailConfigured = isGmailConfigured();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden">
          <Logo href="/admin" />
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <span className="font-display text-sm font-semibold tracking-tight">
            GamePilot<span className="text-gradient">AI</span>
          </span>
          <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Owner Console</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 sm:flex">
            <Badge
              variant={
                systemStatus.databaseReachable
                  ? "success"
                  : systemStatus.reason === "not_configured"
                    ? "outline"
                    : "destructive"
              }
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  systemStatus.databaseReachable ? "bg-emerald-400" : "bg-muted-foreground",
                )}
                aria-hidden="true"
              />
              {systemStatus.databaseReachable
                ? "System online"
                : systemStatus.reason === "not_configured"
                  ? "DB not configured"
                  : "DB offline"}
            </Badge>
            <Badge variant={gmailConfigured ? "blue" : "outline"}>
              Gmail {gmailConfigured ? "ready" : "not configured"}
            </Badge>
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-2.5 py-1 text-xs text-muted-foreground md:flex">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
            <span>Owner session</span>
            {session ? (
              <span className="font-mono text-[11px]">until {sessionExpiry(session.expiresAt)} UTC</span>
            ) : null}
          </div>

          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/games">
              Storefront
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>

          <AdminLogoutButton />
          <AdminMobileNav />
        </div>
      </div>
    </header>
  );
}
