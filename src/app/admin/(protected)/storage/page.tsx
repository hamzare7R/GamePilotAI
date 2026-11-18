import type { Metadata } from "next";
import { HardDrive } from "lucide-react";

import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Storage" };

export default function AdminStoragePage() {
  return (
    <SectionPlaceholder
      title="Storage"
      description="Messages and attachments retained in Neon. Current byte usage is already summarised on the Overview."
      icon={HardDrive}
      planned={[
        "Attachment byte usage",
        "Message content footprint",
        "Per-account storage",
        "Retention policy",
      ]}
    />
  );
}
