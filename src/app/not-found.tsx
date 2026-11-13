import Link from "next/link";
import { Compass } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-radial-glow px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      <div className="relative flex flex-col items-center">
        <Logo />
        <span className="mt-10 font-mono text-sm tracking-[0.3em] text-brand-cyan">404</span>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Lost in the <span className="text-gradient">map</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          This route does not exist yet. Head back to the command center and pick up where you left
          off.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">
              <Compass />
              Open dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
