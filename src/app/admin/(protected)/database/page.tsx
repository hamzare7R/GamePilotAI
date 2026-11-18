import type { Metadata } from "next";
import { Database } from "lucide-react";

import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Database Monitor" };

export default function AdminDatabasePage() {
  return (
    <SectionPlaceholder
      title="Database Monitor"
      description="Neon connection health and table-level activity. The live probe latency and storage totals already appear on the Overview."
      icon={Database}
      planned={[
        "Connection latency history",
        "Table row counts",
        "Slow-query signals",
        "Schema health checks",
      ]}
    />
  );
}
