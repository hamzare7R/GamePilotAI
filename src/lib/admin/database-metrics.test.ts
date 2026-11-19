import { describe, expect, it } from "vitest";

import {
  appendHealthCheck,
  classifyLatency,
  providerLabel,
  safeDatabaseErrorCode,
  shareOf,
  sumDefined,
  toSafeNumber,
  topBySize,
  type DatabaseCheck,
} from "./database-metrics";

describe("classifyLatency", () => {
  it("treats a missing latency as operational", () => {
    expect(classifyLatency(null)).toBe("operational");
    expect(classifyLatency(0)).toBe("operational");
    expect(classifyLatency(999)).toBe("operational");
  });

  it("marks a slow probe as degraded from one second", () => {
    expect(classifyLatency(1_000)).toBe("degraded");
    expect(classifyLatency(2_500)).toBe("degraded");
  });
});

describe("providerLabel", () => {
  it("recognises Neon hosts without leaking the hostname", () => {
    const label = providerLabel("postgresql://user:secret@ep-cool-name.eu-central-1.aws.neon.tech/db");
    expect(label).toBe("Neon PostgreSQL");
    expect(label).not.toContain("neon.tech");
    expect(label).not.toContain("secret");
  });

  it("falls back to PostgreSQL for other or invalid values", () => {
    expect(providerLabel("postgresql://user:secret@localhost:5432/db")).toBe("PostgreSQL");
    expect(providerLabel("not a url")).toBe("PostgreSQL");
  });
});

describe("safeDatabaseErrorCode", () => {
  it("maps known SQLSTATE and network codes", () => {
    expect(safeDatabaseErrorCode({ code: "42501" })).toBe("PERMISSION_DENIED");
    expect(safeDatabaseErrorCode({ code: "42P01" })).toBe("TABLE_MISSING");
    expect(safeDatabaseErrorCode({ code: "ENOTFOUND" })).toBe("HOST_NOT_FOUND");
    expect(safeDatabaseErrorCode({ code: "DATABASE_UNAVAILABLE" })).toBe("DATABASE_UNAVAILABLE");
  });

  it("passes through well-formed codes only", () => {
    expect(safeDatabaseErrorCode({ code: "57014" })).toBe("QUERY_CANCELLED");
    expect(safeDatabaseErrorCode({ code: "XX000" })).toBe("XX000");
  });

  it("never returns free text from the error message", () => {
    const error = new Error("password=super-secret host=ep-hidden.neon.tech");
    expect(safeDatabaseErrorCode(error, "PROBE_FAILED")).toBe("PROBE_FAILED");
    expect(safeDatabaseErrorCode({ code: "weird code with spaces" })).toBe("QUERY_FAILED");
  });
});

describe("toSafeNumber", () => {
  it("parses bigint strings and rejects unusable values", () => {
    expect(toSafeNumber("4096")).toBe(4096);
    expect(toSafeNumber(12)).toBe(12);
    expect(toSafeNumber("-1")).toBeNull();
    expect(toSafeNumber("not-a-number")).toBeNull();
    expect(toSafeNumber(null)).toBeNull();
    expect(toSafeNumber(undefined)).toBeNull();
  });
});

describe("size helpers", () => {
  it("sums only defined values", () => {
    expect(sumDefined([1, null, 2])).toBe(3);
    expect(sumDefined([null, null])).toBeNull();
    expect(sumDefined([])).toBeNull();
  });

  it("computes a bounded share", () => {
    expect(shareOf(50, 200)).toBe(25);
    expect(shareOf(300, 200)).toBe(100);
    expect(shareOf(null, 200)).toBeNull();
    expect(shareOf(10, 0)).toBeNull();
  });

  it("keeps the largest entries first and respects the limit", () => {
    const rows = [
      { name: "small", bytes: 1 },
      { name: "missing", bytes: null },
      { name: "large", bytes: 100 },
    ];
    expect(topBySize(rows, (row) => row.bytes, 2).map((row) => row.name)).toEqual([
      "large",
      "small",
    ]);
  });
});

describe("appendHealthCheck", () => {
  const check = (index: number): DatabaseCheck => ({
    at: new Date(index * 1_000).toISOString(),
    ok: true,
    latencyMs: index,
    code: null,
  });

  it("appends a sample and drops the oldest beyond the limit", () => {
    const history = [check(1), check(2), check(3)];
    const next = appendHealthCheck(history, check(4), 3);
    expect(next.map((entry) => entry.latencyMs)).toEqual([2, 3, 4]);
    expect(history).toHaveLength(3);
  });
});
