import type { Metadata } from "next";

import { TermsOfService } from "@/components/terms/terms-policy";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules and provisions governing access to GamePilotAI and use of its services and features — available in German and English.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return <TermsOfService />;
}
