import { Badge } from "@/components/ui/badge";

type GmailBadgeVariant = "success" | "destructive" | "secondary" | "outline";

const GMAIL_STATUS: Record<string, { label: string; variant: GmailBadgeVariant }> = {
  active: { label: "Connected", variant: "success" },
  error: { label: "Error", variant: "destructive" },
  revoked: { label: "Revoked", variant: "secondary" },
};

export function GmailStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">Not linked</Badge>;
  const meta = GMAIL_STATUS[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function SessionStatusBadge({
  totalSessions,
  activeSessions,
}: {
  totalSessions: number;
  activeSessions: number;
}) {
  if (activeSessions > 0) {
    return (
      <Badge variant="success">
        {activeSessions === 1 ? "Valid session" : `${activeSessions} valid`}
      </Badge>
    );
  }
  if (totalSessions > 0) return <Badge variant="outline">Expired</Badge>;
  return <Badge variant="secondary">No sessions</Badge>;
}
