import { describe, expect, it } from "vitest";

import {
  buildServiceUsersHref,
  buildServicesHref,
  clampPage,
  isKnownServiceKey,
  isSafeServiceName,
  matchingServiceKeys,
  pageWindow,
  parseServiceListParams,
  parseServiceUserParams,
  safeFailureCode,
  safeUserLabel,
  serviceLabel,
  toAggregateCount,
} from "./services";

describe("serviceLabel", () => {
  it("uses registry labels for known services", () => {
    expect(serviceLabel("google")).toBe("Google");
    expect(serviceLabel("garena")).toBe("Garena / Free Fire");
  });

  it("labels the other bucket explicitly without inventing a service", () => {
    expect(serviceLabel("other")).toBe("Other / Unknown Senders");
  });

  it("falls back to the raw key for unknown services", () => {
    expect(serviceLabel("legacy.service")).toBe("legacy.service");
  });
});

describe("isKnownServiceKey", () => {
  it("recognises registry keys only", () => {
    expect(isKnownServiceKey("steam")).toBe(true);
    expect(isKnownServiceKey("other")).toBe(true);
    expect(isKnownServiceKey("legacy.service")).toBe(false);
  });
});

describe("isSafeServiceName", () => {
  it("accepts registry keys and conservative legacy keys", () => {
    expect(isSafeServiceName("google")).toBe(true);
    expect(isSafeServiceName("other")).toBe(true);
    expect(isSafeServiceName("legacy.service")).toBe(true);
  });

  it("rejects values that cannot be a stored service key", () => {
    expect(isSafeServiceName("")).toBe(false);
    expect(isSafeServiceName("../users")).toBe(false);
    expect(isSafeServiceName("free fire")).toBe(false);
    expect(isSafeServiceName("service%")).toBe(false);
    expect(isSafeServiceName("service'")).toBe(false);
    expect(isSafeServiceName(`a${"b".repeat(64)}`)).toBe(false);
  });
});

describe("matchingServiceKeys", () => {
  it("matches keys and labels case-insensitively", () => {
    expect(matchingServiceKeys("GOOGLE")).toEqual(["google"]);
    expect(matchingServiceKeys("free fire")).toContain("garena");
  });

  it("never treats the other bucket as a detected service", () => {
    expect(matchingServiceKeys("other services")).toEqual([]);
  });

  it("returns no keys for an empty or unknown query", () => {
    expect(matchingServiceKeys("   ")).toEqual([]);
    expect(matchingServiceKeys("not-a-registered-service")).toEqual([]);
  });
});

describe("parseServiceListParams", () => {
  it("applies safe defaults", () => {
    expect(parseServiceListParams({})).toEqual({ query: "", sort: "users", page: 1 });
  });

  it("trims the query and rejects unknown sort values", () => {
    expect(parseServiceListParams({ q: "  steam  ", sort: "drop table", page: "0" })).toEqual({
      query: "steam",
      sort: "users",
      page: 1,
    });
  });

  it("reads the first value from repeated parameters", () => {
    expect(parseServiceListParams({ q: ["garena", "steam"], page: ["3", "9"] })).toEqual({
      query: "garena",
      sort: "users",
      page: 3,
    });
  });
});

describe("parseServiceUserParams", () => {
  it("uses the newest activity order by default", () => {
    expect(parseServiceUserParams({})).toEqual({ query: "", sort: "last_seen", page: 1 });
    expect(parseServiceUserParams({ sort: "gmail_status", page: "-4" })).toEqual({
      query: "",
      sort: "gmail_status",
      page: 1,
    });
  });
});

describe("toAggregateCount", () => {
  it("accepts database counts including zero and bigint strings", () => {
    expect(toAggregateCount(0)).toBe(0);
    expect(toAggregateCount("42")).toBe(42);
  });

  it("fails closed instead of inventing a zero", () => {
    expect(() => toAggregateCount(null)).toThrow();
    expect(() => toAggregateCount(undefined)).toThrow();
    expect(() => toAggregateCount("-1")).toThrow();
    expect(() => toAggregateCount("not-a-number")).toThrow();
  });
});

describe("pagination", () => {
  it("keeps an empty result on page one", () => {
    expect(clampPage(9, 0, 20)).toEqual({ page: 1, pageCount: 1 });
    expect(pageWindow(9, 0, 20)).toEqual({ page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it("clamps an out-of-range page to the last page", () => {
    expect(clampPage(5, 45, 20)).toEqual({ page: 3, pageCount: 3 });
    expect(pageWindow(5, 45, 20)).toEqual({ page: 3, pageCount: 3, start: 41, end: 45 });
  });
});

describe("href builders", () => {
  it("omits default values from the services URL", () => {
    expect(buildServicesHref({ query: "", sort: "users", page: 1 })).toBe("/admin/services");
  });

  it("preserves explicit filters and pages", () => {
    expect(buildServicesHref({ query: "free fire", sort: "last_seen", page: 2 })).toBe(
      "/admin/services?q=free+fire&sort=last_seen&page=2",
    );
    expect(buildServiceUsersHref("garena", { query: "", sort: "last_seen", page: 2 })).toBe(
      "/admin/services/garena?page=2",
    );
  });
});

describe("safeUserLabel", () => {
  it("prefers a trimmed display name", () => {
    expect(safeUserLabel("  Alice  ", "abcdef123456")).toBe("Alice");
  });

  it("falls back to a short identifier without exposing a full user id", () => {
    expect(safeUserLabel("", "abcdef123456")).toBe("User abcdef12");
  });

  it("does not render an email address used as a display name", () => {
    expect(safeUserLabel("player@example.com", "abcdef123456")).toBe("User abcdef12");
  });
});

describe("safeFailureCode", () => {
  it("returns a SQLSTATE code", () => {
    expect(safeFailureCode({ code: "42P01", message: "secret table name" })).toBe("42P01");
  });

  it("never returns message text", () => {
    const code = safeFailureCode(new Error("password=secret"));
    expect(code).toBe("Error");
    expect(code).not.toContain("secret");
  });

  it("rejects unsafe code strings", () => {
    expect(safeFailureCode({ code: "SELECT * FROM users" })).toBe("UNKNOWN");
  });

  it("rejects a custom error name that could carry details", () => {
    const error = new Error("boom");
    error.name = "secret-detail";
    expect(safeFailureCode(error)).toBe("UNKNOWN");
  });
});
