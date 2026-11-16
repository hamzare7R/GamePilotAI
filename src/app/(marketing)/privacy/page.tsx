import type { Metadata } from "next";

import { PrivacyPolicy } from "@/components/privacy/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How GamePilotAI collects, uses, stores and protects information — available in German and English.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
