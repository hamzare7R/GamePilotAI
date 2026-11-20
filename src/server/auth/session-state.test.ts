import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./user", () => ({ findUserBySessionToken: vi.fn() }));

import { resolveSessionState } from "./session-state";
import { findUserBySessionToken } from "./user";

const finder = vi.mocked(findUserBySessionToken);
const user = { id: "user-1", email: "user@localhost", displayName: "Player" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveSessionState", () => {
  it("treats a missing cookie as unauthenticated without touching the database", async () => {
    await expect(resolveSessionState(undefined)).resolves.toEqual({ state: "unauthenticated" });
    expect(finder).not.toHaveBeenCalled();
  });

  it("treats an expired or unknown token as unauthenticated", async () => {
    finder.mockResolvedValue(null);

    await expect(resolveSessionState("token")).resolves.toEqual({ state: "unauthenticated" });
  });

  it("returns the authenticated user", async () => {
    finder.mockResolvedValue(user);

    await expect(resolveSessionState("token")).resolves.toEqual({
      state: "authenticated",
      user,
    });
  });

  it("reports a database outage as unavailable instead of unauthenticated", async () => {
    finder.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.1:5432"));

    const state = await resolveSessionState("token");

    expect(state).toEqual({ state: "unavailable" });
    expect(JSON.stringify(state)).not.toContain("ECONNREFUSED");
  });
});
