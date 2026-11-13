import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "AI Coach",
};

export default function CoachPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="AI Coach"
        description="Personalized coaching, build ideas and session plans based on how you actually play."
        actions={<Badge variant="blue">Beta</Badge>}
      />

      <EmptyState
        icon={Sparkles}
        title="Your coach is warming up"
        description="Coach sessions, messages and recommendations are typed in coachService. Connect your platforms and the coach will open with your first session plan."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
