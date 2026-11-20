import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/library", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("GET /api/library", () => {
  it("rejects an unsupported status before touching the database", async () => {
    const response = await GET(new NextRequest("http://localhost/api/library?status=wishlist"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_QUERY");
  });

  it("rejects page zero and oversized pages", async () => {
    expect((await GET(new NextRequest("http://localhost/api/library?page=0"))).status).toBe(400);
    expect((await GET(new NextRequest("http://localhost/api/library?pageSize=41"))).status).toBe(400);
  });

  it("rejects searches longer than 120 characters", async () => {
    const search = "a".repeat(121);
    const response = await GET(
      new NextRequest(`http://localhost/api/library?search=${search}`),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/library", () => {
  it("rejects cross-origin writes", async () => {
    const response = await POST(jsonRequest({ gameId: "3498" }, { origin: "https://evil.example" }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error.code).toBe("INVALID_ORIGIN");
  });

  it("rejects invalid payloads before authentication", async () => {
    const response = await POST(jsonRequest({ gameId: "bad id!" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_BODY");
  });

  it("rejects unknown fields", async () => {
    const response = await POST(jsonRequest({ gameId: "3498", userId: "other-user" }));
    expect(response.status).toBe(400);
  });

  it("requires a session for a valid payload", async () => {
    const response = await POST(jsonRequest({ gameId: "3498" }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
