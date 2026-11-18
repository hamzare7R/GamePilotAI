import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import {
  getAdminSessionInfo,
  hasAdminSession,
  isAdminAuthConfigured,
} from "@/server/auth/admin";
import { getAdminSystemStatus } from "@/server/admin/overview";

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

  const [session, systemStatus] = await Promise.all([getAdminSessionInfo(), getAdminSystemStatus()]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <AdminSidebar />
      <div className="flex min-h-dvh flex-col">
        <AdminHeader session={session} systemStatus={systemStatus} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
