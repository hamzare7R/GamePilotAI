import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gamepad2, Inbox } from "lucide-react";

import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasAdminSession, isAdminAuthConfigured } from "@/server/auth/admin";

// Sessions are read from cookies on every request; never prerender or cache.
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
          <h1 className="font-display text-xl font-semibold text-amber-200">
            Admin access is not configured
          </h1>
          <p className="mt-2 text-sm text-amber-200/80">
            Set <code className="font-mono">ADMIN_PASSWORD_HASH</code> or{" "}
            <code className="font-mono">ADMIN_PASSWORD</code>, plus{" "}
            <code className="font-mono">ADMIN_SESSION_SECRET</code>, then reload.
          </p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/games">Back to games</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!(await hasAdminSession())) redirect("/admin/login");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <Badge variant="outline">Owner area</Badge>
        </div>
        <nav aria-label="Admin" className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/games">
              <ArrowLeft aria-hidden="true" />
              Storefront
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/games">
              <Gamepad2 aria-hidden="true" />
              Custom games
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/mail-monitor">
              <Inbox aria-hidden="true" />
              Mail monitor
            </Link>
          </Button>
          <AdminLogoutButton />
        </nav>
      </header>

      {children}
    </div>
  );
}
