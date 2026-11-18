import Link from "next/link";
import { Construction, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

type SectionPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  planned: string[];
};

export function SectionPlaceholder({
  title,
  description,
  icon: Icon,
  planned,
}: SectionPlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner console"
        title={title}
        description={description}
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin">Back to overview</Link>
          </Button>
        }
      />

      <EmptyState
        icon={Construction}
        title={`${title} arrives in the next phase`}
        description="This route is part of the admin shell. Detailed views will be connected to live Neon data in a later phase — no placeholder metrics are shown here."
        action={
          <Button asChild variant="outline">
            <Link href="/admin">View live overview</Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-border/70 bg-card/40 p-5">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          <Icon className="size-3.5 text-primary" aria-hidden="true" />
          Planned for this section
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {planned.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
