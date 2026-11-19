/**
 * Pure progress accounting for stored-message MIME reprocessing.
 *
 * A run is a fixed range of notification ids (`upperBoundId` captured at start,
 * `cursorId` advanced only after a batch is persisted). Keeping the arithmetic
 * here makes resume/duplication behaviour testable without a database.
 */

export type ReprocessStatus = "running" | "paused" | "completed" | "failed";

export type ReprocessState = {
  status: ReprocessStatus;
  total: number;
  processed: number;
  updated: number;
  failed: number;
  cursorId: string | null;
  upperBoundId: string | null;
  lastErrorCode: string | null;
};

export type ReprocessProgress = ReprocessState & { remaining: number };

export function summarizeReprocess(state: ReprocessState): ReprocessProgress {
  return { ...state, remaining: Math.max(state.total - state.processed, 0) };
}

export type BatchOutcome = {
  /** Messages fetched or attempted in this batch. */
  attempted: number;
  /** Rows whose text actually changed (database row count). */
  updated: number;
  /** Messages that failed without stopping the run. */
  failed: number;
  /** Last attempted notification id; becomes the resume cursor. */
  lastId: string | null;
  lastErrorCode?: string | null;
  /** A token/quota failure stops the run so it can be resumed later. */
  fatal?: boolean;
};

export function applyBatchOutcome(state: ReprocessState, outcome: BatchOutcome): ReprocessState {
  const processed = state.processed + Math.max(outcome.attempted, 0);
  const updated = state.updated + Math.max(outcome.updated, 0);
  const failed = state.failed + Math.max(outcome.failed, 0);
  const cursorId = outcome.lastId ?? state.cursorId;
  const lastErrorCode = outcome.lastErrorCode ?? state.lastErrorCode;

  if (outcome.fatal) {
    return { ...state, status: "failed", processed, updated, failed, cursorId, lastErrorCode };
  }

  const reachedEnd = outcome.lastId !== null && outcome.lastId === state.upperBoundId;
  const completed = reachedEnd || processed >= state.total;

  return {
    ...state,
    status: completed ? "completed" : "running",
    processed,
    updated,
    failed,
    cursorId,
    lastErrorCode,
  };
}
