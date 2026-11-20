import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth/user")>();
  return { ...actual, findUserBySessionToken: vi.fn() };
});

vi.mock("@/server/library/service", () => ({
  listLibraryForUser: vi.fn(),
  addLibraryEntryForUser: vi.fn(),
}));

import { findUserBySessionToken } from "@/server/auth/user";
import { LibraryNotReadyError } from "@/server/library/errors";
import { listLibraryForUser } from "@/server/library/service";

import { GET, POST } from "./route";

const findUserMock = vi.mocked(findUserBySessionToken);
const listMock = vi.mocked(listLibraryForUser);

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("GET /api/library for a signed-in user", () => {
  it("returns the paginated library from the service", async () => {
    findUserMock.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      displayName: "Player",
    });
    listMock.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/library", {
        headers: { cookie: "gp_session=token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.items).toEqual([]);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(listMock).toHaveBeenCalledWith("user-1", expect.objectContaining({ page: 1 }));
  });

  it("reports an uninitialized library table as 503 storage", async () => {
    findUserMock.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      displayName: "Player",
    });
    listMock.mockRejectedValue(new LibraryNotReadyError());

    const response = await GET(
      new NextRequest("http://localhost/api/library", {
        headers: { cookie: "gp_session=token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("LIBRARY_STORAGE_NOT_INITIALIZED");
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
