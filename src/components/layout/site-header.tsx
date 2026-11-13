"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { marketingNav } from "@/config/navigation";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/api/health">API status</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">
              Launch app
              <ArrowRight />
            </Link>
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Menu</DialogTitle>
                <DialogDescription>Navigate GamePilot AI.</DialogDescription>
              </DialogHeader>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {marketingNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
              <Button asChild className="w-full">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  Launch app
                  <ArrowRight />
                </Link>
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
