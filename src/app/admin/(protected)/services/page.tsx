import type { Metadata } from "next";
import { Plug } from "lucide-react";

import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Connected Services" };

export default function AdminServicesPage() {
  return (
    <SectionPlaceholder
      title="Connected Services"
      description="Services detected across connected inboxes, without exposing message contents or sender addresses."
      icon={Plug}
      planned={[
        "Per-service detection counts",
        "Last detection time",
        "Notification volume",
        "Service mapping overrides",
      ]}
    />
  );
}
