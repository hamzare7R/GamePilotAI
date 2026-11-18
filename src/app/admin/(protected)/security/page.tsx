import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Security & Permissions" };

export default function AdminSecurityPage() {
  return (
    <SectionPlaceholder
      title="Security & Permissions"
      description="Owner session details and access rules. Authentication itself is unchanged and remains enforced by the existing admin guard."
      icon={ShieldCheck}
      planned={[
        "Owner session details",
        "API access rules",
        "Audit trail",
        "Session revocation",
      ]}
    />
  );
}
