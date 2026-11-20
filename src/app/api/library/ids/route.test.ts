import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth/user")>();
  return { ...actual, findUserBySessionToken: vi.fn() };
});

vi.mock("@/server/library/service", () => ({
  listLibraryMembershipForUser: vi.fn(),
}));

import { findUserBySessionToken } from "@/server/auth/user";
import { DatabaseUnavailableError } from "@/server/db/pool";
import { LibraryNotReadyError } from "@/server/library/errors";
import { listLibraryMembershipForUser } from "@/server/library/service";

import { GET } from "./route";

const findUserMock = vi.mocked(findUserBySessionToken);
const membershipMock = vi.mocked(listLibraryMembershipForUser);

const user = { id: "user-1", email: "player@example.com", displayName: "Player" };

function signedInRequest() {
  return new NextRequest("http://localhost/api/library/ids", {
    headers: { cookie: "gp_session=token" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/library/ids", () => {
  it("rejects guests without a session", async () => {
    const response = await GET(new NextRequest("http://localhost/api/library/ids"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("UNAUTHORIZED");
    expect(membershipMock).not.toHaveBeenCalled();
  });

  it("returns the membership list for a signed-in user", async () => {
    findUserMock.mockResolvedValue(user);
    membershipMock.mockResolvedValue([
      { entryId: "entry-1", gameId: "3498", gameSource: "rawg", status: "backlog" },
    ]);

    const response = await GET(signedInRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      { entryId: "entry-1", gameId: "3498", gameSource: "rawg", status: "backlog" },
    ]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports an uninitialized library table as 503 storage", async () => {
    findUserMock.mockResolvedValue(user);
    membershipMock.mockRejectedValue(new LibraryNotReadyError());

    const response = await GET(signedInRequest());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("LIBRARY_STORAGE_NOT_INITIALIZED");
  });

  it("reports an unreachable database as 503 DATABASE_UNAVAILABLE", async () => {
    findUserMock.mockResolvedValue(user);
    membershipMock.mockRejectedValue(new DatabaseUnavailableError("down"));

    const response = await GET(signedInRequest());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("DATABASE_UNAVAILABLE");
  });
});
