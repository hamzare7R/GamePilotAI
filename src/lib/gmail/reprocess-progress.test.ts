import { describe, expect, it } from "vitest";

import {
  applyBatchOutcome,
  summarizeReprocess,
  type ReprocessState,
} from "./reprocess-progress";

function state(overrides: Partial<ReprocessState> = {}): ReprocessState {
  return {
    status: "running",
    total: 10,
    processed: 0,
    updated: 0,
    failed: 0,
    cursorId: null,
    upperBoundId: "m10",
    lastErrorCode: null,
    ...overrides,
  };
}

describe("summarizeReprocess", () => {
  it("reports the remaining count", () => {
    expect(summarizeReprocess(state({ processed: 4 })).remaining).toBe(6);
  });

  it("never reports a negative remaining count", () => {
    expect(summarizeReprocess(state({ processed: 12 })).remaining).toBe(0);
  });
});

describe("applyBatchOutcome", () => {
  it("advances counters and cursor after a partial batch", () => {
    const next = applyBatchOutcome(state(), {
      attempted: 3,
      updated: 2,
      failed: 1,
      lastId: "m3",
    });

    expect(next).toMatchObject({
      status: "running",
      processed: 3,
      updated: 2,
      failed: 1,
      cursorId: "m3",
      lastErrorCode: null,
    });
    expect(summarizeReprocess(next).remaining).toBe(7);
  });

  it("completes when the batch reaches the captured upper bound", () => {
    const next = applyBatchOutcome(state({ processed: 7, cursorId: "m7" }), {
      attempted: 3,
      updated: 3,
      failed: 0,
      lastId: "m10",
    });

    expect(next.status).toBe("completed");
    expect(next.processed).toBe(10);
    expect(summarizeReprocess(next).remaining).toBe(0);
  });

  it("completes once every candidate was processed", () => {
    const next = applyBatchOutcome(state({ total: 3 }), {
      attempted: 3,
      updated: 1,
      failed: 0,
      lastId: "m3",
    });

    expect(next.status).toBe("completed");
  });

  it("stops fatally but keeps the cursor at the last saved message", () => {
    const next = applyBatchOutcome(state({ processed: 3, cursorId: "m3" }), {
      attempted: 2,
      updated: 2,
      failed: 0,
      lastId: "m5",
      lastErrorCode: "GMAIL_AUTHORIZATION_FAILED",
      fatal: true,
    });

    expect(next).toMatchObject({
      status: "failed",
      processed: 5,
      cursorId: "m5",
      lastErrorCode: "GMAIL_AUTHORIZATION_FAILED",
    });
  });

  it("does not complete a run after a fatal abort", () => {
    const next = applyBatchOutcome(state({ total: 5, processed: 3, cursorId: "m3" }), {
      attempted: 2,
      updated: 2,
      failed: 0,
      lastId: "m5",
      lastErrorCode: "TOKEN_REFRESH_FAILED",
      fatal: true,
    });

    expect(next.status).toBe("failed");
    expect(next.processed).toBe(5);
  });

  it("records non-fatal message failures without stopping the run", () => {
    const next = applyBatchOutcome(state(), {
      attempted: 3,
      updated: 0,
      failed: 3,
      lastId: "m3",
      lastErrorCode: "NOT_FOUND",
    });

    expect(next).toMatchObject({ status: "running", failed: 3, cursorId: "m3" });
    expect(next.lastErrorCode).toBe("NOT_FOUND");
  });

  it("keeps the cursor when a batch produced no rows", () => {
    const next = applyBatchOutcome(state({ processed: 2, cursorId: "m2" }), {
      attempted: 0,
      updated: 0,
      failed: 0,
      lastId: null,
    });

    expect(next.status).toBe("running");
    expect(next.cursorId).toBe("m2");
  });
});
