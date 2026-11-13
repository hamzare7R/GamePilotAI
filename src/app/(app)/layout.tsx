import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
        <AppTopbar />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
