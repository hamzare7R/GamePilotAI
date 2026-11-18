import type { Metadata } from "next";
import { Users } from "lucide-react";

import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <SectionPlaceholder
      title="Users"
      description="Account directory and session health. Live totals for registered and active users already appear on the Overview."
      icon={Users}
      planned={[
        "Account directory with search",
        "Active session inspection",
        "Access and role controls",
        "Per-account connection status",
      ]}
    />
  );
}
