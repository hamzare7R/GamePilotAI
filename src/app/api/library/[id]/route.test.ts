import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { DELETE, PATCH } from "./route";

const entryId = "11111111-1111-1111-1111-111111111111";

function patchRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/library/${entryId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/library/[id]", () => {
  it("rejects malformed entry ids", async () => {
    const response = await PATCH(patchRequest({ status: "playing" }), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_ENTRY_ID");
  });

  it("rejects an empty update", async () => {
    const response = await PATCH(patchRequest({}), {
      params: Promise.resolve({ id: entryId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("INVALID_BODY");
  });

  it("rejects out-of-range progress", async () => {
    const response = await PATCH(patchRequest({ progress: 101 }), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(400);
  });

  it("requires a session before updating", async () => {
    const response = await PATCH(patchRequest({ status: "playing" }), {
      params: Promise.resolve({ id: entryId }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});

describe("DELETE /api/library/[id]", () => {
  it("rejects malformed entry ids", async () => {
    const request = new NextRequest(`http://localhost/api/library/${entryId}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: "x" }) });

    expect(response.status).toBe(400);
  });

  it("requires a session before deleting", async () => {
    const request = new NextRequest(`http://localhost/api/library/${entryId}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: entryId }) });

    expect(response.status).toBe(401);
  });
});
