import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { hasAdminSession } from "@/server/auth/admin";
import { getSessionUser } from "@/server/auth/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The owner session cookie is httpOnly, so it can only be verified here on the
  // server. The resulting boolean is all the client ever sees.
  const [isOwner, user] = await Promise.all([hasAdminSession(), getSessionUser()]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>
      <AppSidebar />
      <div className="flex min-h-dvh flex-col">
        <AppTopbar isOwner={isOwner} user={user} />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
