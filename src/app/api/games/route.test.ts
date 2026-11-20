import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/games", () => {
  it("rejects page numbers beyond the supported catalog range", async () => {
    const response = await GET(new NextRequest("http://localhost/api/games?page=101"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_QUERY");
    expect(payload.error.message).toBe("Page number is outside the supported catalog range.");
  });

  it("rejects the display-only other genre as a filter", async () => {
    const response = await GET(new NextRequest("http://localhost/api/games?genre=other"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_QUERY");
    expect(payload.error.message).toBe("Unsupported genre filter.");
  });
});
