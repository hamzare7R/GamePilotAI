"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Home, Menu, Search, Settings, ShieldCheck, UserRound } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dashboardNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopbar({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentItem = dashboardNav
    .flatMap((section) => section.items)
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
            <Menu />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription>Jump to a section of your command center.</DialogDescription>
          </DialogHeader>
          <nav className="flex flex-col gap-4" aria-label="Mobile dashboard">
            {dashboardNav.map((section) => (
              <div key={section.title} className="flex flex-col gap-1">
                <p className="px-2 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-primary/12 text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {Icon ? <Icon className={cn("size-4", active && "text-primary")} /> : null}
                      <span className="flex-1">{item.title}</span>
                      {item.badge ? (
                        <span className="text-[10px] text-brand-cyan">{item.badge}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </DialogContent>
      </Dialog>

      <div className="lg:hidden">
        <Logo showText={false} />
      </div>

      <div className="hidden flex-col lg:flex">
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/70 uppercase">
          Command center
        </span>
        <span className="text-sm font-medium">{currentItem?.title ?? "Dashboard"}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <form role="search" className="relative hidden w-64 md:block" onSubmit={(event) => event.preventDefault()}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search games, guides, friends…"
            aria-label="Search"
            className="h-9 pl-9"
          />
        </form>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
              <Bell />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-brand-cyan" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications — coming soon</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border/70 py-1 pr-2 pl-1 transition-colors hover:border-primary/40 hover:bg-muted/60"
              aria-label="Account menu"
            >
              <Avatar className="size-8">
                <AvatarFallback>GP</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:block">Guest Pilot</span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-sm font-medium text-foreground">Guest Pilot</span>
              <span className="block text-xs text-muted-foreground">Local session</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserRound />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            {isOwner ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/games">
                    <ShieldCheck />
                    Owner Area
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">
                <Home />
                Back to site
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
