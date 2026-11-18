import {
  Database,
  Gamepad2,
  HardDrive,
  Inbox,
  LayoutDashboard,
  Plug,
  ScrollText,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Console",
    items: [
      {
        title: "Overview",
        href: "/admin",
        description: "Live platform metrics and system health.",
        icon: LayoutDashboard,
      },
      {
        title: "Users",
        href: "/admin/users",
        description: "Accounts, sessions and access.",
        icon: Users,
      },
      {
        title: "Database Monitor",
        href: "/admin/database",
        description: "Connection health and table activity.",
        icon: Database,
      },
      {
        title: "Mail Monitor",
        href: "/admin/mail-monitor",
        description: "Gmail sync health and service detection.",
        icon: Inbox,
      },
      {
        title: "Connected Services",
        href: "/admin/services",
        description: "Services detected across inboxes.",
        icon: Plug,
      },
      {
        title: "System Logs",
        href: "/admin/logs",
        description: "Sync events and error history.",
        icon: ScrollText,
      },
      {
        title: "Security & Permissions",
        href: "/admin/security",
        description: "Owner sessions and access rules.",
        icon: ShieldCheck,
      },
      {
        title: "Storage",
        href: "/admin/storage",
        description: "Stored messages and attachments.",
        icon: HardDrive,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Custom Games",
        href: "/admin/games",
        description: "Owner-managed catalog entries.",
        icon: Gamepad2,
      },
      {
        title: "Storefront",
        href: "/games",
        description: "View the public games catalog.",
        icon: Store,
      },
    ],
  },
];

export function isAdminNavActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}
