import { NextResponse } from "next/server";
import { z } from "zod";

import { listPublishedCustomEntries } from "@/server/custom-games/service";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Invalid query.", code: "INVALID_QUERY" } },
      { status: 400 },
    );
  }

  try {
    const entries = await listPublishedCustomEntries({
      query: parsed.data.search ?? "",
      platform: "all",
      genre: "all",
    });

    return NextResponse.json(
      { data: entries.slice(0, parsed.data.limit) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn(
      "[custom-games] public list unavailable:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error: {
          message: "Custom games are temporarily unavailable.",
          code: "CUSTOM_STORE_UNAVAILABLE",
        },
      },
      { status: 503 },
    );
  }
}
