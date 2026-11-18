import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "System Logs" };

export default function AdminLogsPage() {
  return (
    <SectionPlaceholder
      title="System Logs"
      description="Mail sync events and failure codes. The eight most recent events are already listed on the Overview."
      icon={ScrollText}
      planned={[
        "Full sync event history",
        "Error-code filters",
        "Event detail view",
        "Retention controls",
      ]}
    />
  );
}
