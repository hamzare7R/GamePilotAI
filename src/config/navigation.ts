import {
  Gamepad2,
  Inbox,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const marketingNav: NavItem[] = [
  { title: "Features", href: "/#features" },
  { title: "How it works", href: "/#how-it-works" },
  { title: "Dashboard", href: "/dashboard" },
];

export const dashboardNav: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Play",
    items: [
      { title: "Games", href: "/games", icon: Gamepad2 },
      { title: "Library", href: "/library", icon: LibraryBig },
    ],
  },
  {
    title: "Intelligence",
    items: [{ title: "AI Coach", href: "/coach", icon: Sparkles, badge: "Beta" }],
  },
  {
    title: "Integrations",
    items: [{ title: "Mail Monitor", href: "/mail-monitor", icon: Inbox }],
  },
  {
    title: "Account",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];

export const footerNav: NavSection[] = [
  {
    title: "Product",
    items: [
      { title: "Features", href: "/#features" },
      { title: "Dashboard", href: "/dashboard" },
      { title: "AI Coach", href: "/coach" },
    ],
  },
  {
    title: "Resources",
    items: [
      { title: "How it works", href: "/#how-it-works" },
      { title: "API health", href: "/api/health" },
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Terms of Service", href: "/terms" },
    ],
  },
];
