import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { hasAdminSession, isAdminAuthConfigured } from "@/server/auth/admin";

export const metadata: Metadata = {
  title: "Owner sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await hasAdminSession()) redirect("/admin/games");

  const configured = isAdminAuthConfigured();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <Badge variant="outline">Owner area</Badge>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/50 p-6 shadow-glow-purple backdrop-blur-xl">
        <h1 className="font-display text-2xl font-semibold">Sign in to manage the catalog</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Custom games are only visible to you until they are published.
        </p>

        {configured ? (
          <AdminLoginForm />
        ) : (
          <div role="alert" className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
            <p className="font-medium text-amber-200">Admin access is not configured.</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
              Set <code className="font-mono">ADMIN_PASSWORD_HASH</code> (generate it with{" "}
              <code className="font-mono">npm run admin:hash</code>) and{" "}
              <code className="font-mono">ADMIN_SESSION_SECRET</code> on the server, then reload this
              page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
