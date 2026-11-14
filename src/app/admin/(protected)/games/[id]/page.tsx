import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CustomGameForm } from "@/components/admin/custom-game-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { customGameStatusLabels } from "@/types/custom-game";
import { getCustomGameForAdmin } from "@/server/custom-games/service";

export const metadata: Metadata = {
  title: "Edit custom game",
  robots: { index: false, follow: false },
};

export default async function EditCustomGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let game = null;
  try {
    game = await getCustomGameForAdmin(id);
  } catch (error) {
    console.error("[admin] failed to load custom game:", error);
  }

  if (!game) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{game.name}</h1>
            <Badge variant={game.status === "published" ? "success" : "outline"}>
              {customGameStatusLabels[game.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ID <code className="font-mono text-xs">{game.id}</code> · updated{" "}
            {new Date(game.updatedAt).toLocaleString("en-US")}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/games">
            <ArrowLeft aria-hidden="true" />
            Back to list
          </Link>
        </Button>
      </div>

      <CustomGameForm mode="edit" game={game} />
    </div>
  );
}
