import type { NextRequest } from "next/server";
import { z } from "zod";

import { listCatalog } from "@/server/catalog/service";
import { jsonError, jsonOk } from "@/server/http";

export const revalidate = 3600;

const platformSchema = z.enum([
  "pc",
  "playstation",
  "xbox",
  "switch",
  "android",
  "ios",
  "cloud",
]);

const genreSchema = z.enum([
  "action",
  "adventure",
  "rpg",
  "shooter",
  "strategy",
  "sports",
  "racing",
  "simulation",
  "horror",
  "puzzle",
  "mmo",
  "indie",
  "survival",
  "open-world",
  "multiplayer",
  "other",
]);

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  platform: platformSchema.optional(),
  genre: genreSchema.optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(40).default(20),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));

  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const message =
      field === "platform"
        ? "Unsupported platform filter. Use one of: pc, playstation, xbox, switch, android, ios, cloud."
        : field === "genre"
          ? "Unsupported genre filter."
          : "Invalid catalog query parameters.";
    return jsonError(message, 400, { code: "INVALID_QUERY" });
  }

  const { search, platform, genre, page, pageSize } = parsed.data;

  try {
    const result = await listCatalog({
      search: search || undefined,
      platform: platform ?? "all",
      genre: genre ?? "all",
      page,
      pageSize,
    });

    return jsonOk(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return jsonError("The games catalog is temporarily unavailable. Please retry shortly.", 502, {
      code: "CATALOG_UNAVAILABLE",
    });
  }
}
