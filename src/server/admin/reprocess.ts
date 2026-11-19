import { randomUUID } from "node:crypto";

import { getGmailConfig } from "@/lib/gmail/env";
import { getMessageContent } from "@/lib/gmail/gmail-client";
import { refreshAccessToken } from "@/lib/gmail/oauth";
import {
  applyBatchOutcome,
  summarizeReprocess,
  type ReprocessState,
  type ReprocessStatus,
} from "@/lib/gmail/reprocess-progress";
import { decryptToken } from "@/lib/gmail/token-encryption";
import { getPool } from "@/server/db/pool";
import { getConnectionForUser } from "@/server/mail/repository";
import { ensureMailSchema } from "@/server/mail/schema";

/**
 * Owner-only reprocessing of already stored Gmail messages with the current MIME
 * parser. Only body_text, snippet and content_fetched_at are written; message
 * rows, identifiers, relations and attachment bytes are left untouched.
 */

export const REPROCESS_BATCH_SIZE = 3;
const LEASE_SECONDS = 120;

const AUTH_ABORT_CODES = new Set([
  "TOKEN_REFRESH_FAILED",
  "TOKEN_REFRESH_EMPTY",
  "GMAIL_AUTHORIZATION_FAILED",
]);

type RunRow = {
  id: string;
  user_id: string;
  connection_id: string;
  status: ReprocessStatus;
  upper_bound_id: string | null;
  total: number;
  processed: number;
  updated: number;
  failed: number;
  cursor_id: string | null;
  last_error_code: string | null;
  started_at: Date;
  completed_at: Date | null;
};

const RUN_COLUMNS = `id, user_id, connection_id, status, upper_bound_id, total, processed,
  updated, failed, cursor_id, last_error_code, started_at, completed_at`;

export type ReprocessRunSummary = {
  runId: string | null;
  status: ReprocessStatus;
  total: number;
  processed: number;
  updated: number;
  failed: number;
  remaining: number;
  lastErrorCode: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type ReprocessActionResult = {
  ok: boolean;
  code: string | null;
  message: string;
  summary: ReprocessRunSummary | null;
};

function toState(row: RunRow): ReprocessState {
  return {
    status: row.status,
    total: row.total,
    processed: row.processed,
    updated: row.updated,
    failed: row.failed,
    cursorId: row.cursor_id,
    upperBoundId: row.upper_bound_id,
    lastErrorCode: row.last_error_code,
  };
}

function toSummary(row: RunRow): ReprocessRunSummary {
  const progress = summarizeReprocess(toState(row));
  return {
    runId: row.id,
    status: progress.status,
    total: progress.total,
    processed: progress.processed,
    updated: progress.updated,
    failed: progress.failed,
    remaining: progress.status === "completed" ? 0 : progress.remaining,
    lastErrorCode: progress.lastErrorCode,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
  };
}

function emptySummary(): ReprocessRunSummary {
  return {
    runId: null,
    status: "completed",
    total: 0,
    processed: 0,
    updated: 0,
    failed: 0,
    remaining: 0,
    lastErrorCode: null,
    startedAt: null,
    completedAt: null,
  };
}

function safeDiagnosticCode(error: unknown, fallback: string) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code) ? code : fallback;
}

function success(summary: RunRow | null, message: string, code: string | null = null): ReprocessActionResult {
  return { ok: true, code, message, summary: summary ? toSummary(summary) : emptySummary() };
}

function failure(code: string, message: string, summary: RunRow | null = null): ReprocessActionResult {
  return { ok: false, code, message, summary: summary ? toSummary(summary) : null };
}

async function getRun(userId: string, runId: string) {
  const result = await getPool().query<RunRow>(
    `SELECT ${RUN_COLUMNS} FROM gmail_reprocess_runs WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [runId, userId],
  );
  return result.rows[0] ?? null;
}

async function markRunFailed(userId: string, runId: string, code: string) {
  const result = await getPool().query<RunRow>(
    `UPDATE gmail_reprocess_runs
        SET status = 'failed', last_error_code = $3, lease_expires_at = NULL, updated_at = now()
      WHERE id = $1 AND user_id = $2 AND status IN ('running', 'paused', 'failed')
      RETURNING ${RUN_COLUMNS}`,
    [runId, userId, code],
  );
  return result.rows[0] ?? null;
}

export async function getLatestReprocessSummary(userId: string) {
  await ensureMailSchema();
  const result = await getPool().query<RunRow>(
    `SELECT ${RUN_COLUMNS} FROM gmail_reprocess_runs
      WHERE user_id = $1
      ORDER BY started_at DESC, id DESC
      LIMIT 1`,
    [userId],
  );
  return result.rows[0] ? toSummary(result.rows[0]) : null;
}

/** Creates (or returns) the single active run for this user. */
export async function startReprocess(userId: string): Promise<ReprocessActionResult> {
  await ensureMailSchema();
  if (!getGmailConfig().config) {
    return failure("GMAIL_NOT_CONFIGURED", "Gmail OAuth environment variables are incomplete or invalid.");
  }

  const connection = await getConnectionForUser(userId);
  if (!connection || connection.status === "revoked" || !connection.encryptedRefreshToken) {
    return failure("GMAIL_NOT_CONNECTED", "This user has no usable Gmail connection to fetch messages from.");
  }

  const active = await getPool().query<RunRow>(
    `SELECT ${RUN_COLUMNS} FROM gmail_reprocess_runs
      WHERE user_id = $1 AND status IN ('running', 'paused')
      ORDER BY started_at DESC
      LIMIT 1`,
    [userId],
  );
  if (active.rows[0]) {
    return success(active.rows[0], "Reprocessing already has an active run. Resume it instead of starting a new one.");
  }

  // Fix the candidate range once so new mail cannot shift progress mid-run.
  const startedAt = new Date();
  const counts = await getPool().query<{ total: number; upper_bound_id: string | null }>(
    `SELECT count(*)::int AS total, max(id) AS upper_bound_id
       FROM gmail_notifications
      WHERE user_id = $1 AND content_fetched_at IS NOT NULL AND content_fetched_at <= $2`,
    [userId, startedAt],
  );
  const total = counts.rows[0]?.total ?? 0;
  const upperBoundId = counts.rows[0]?.upper_bound_id ?? null;
  if (total === 0 || !upperBoundId) {
    return failure("NOTHING_TO_REPROCESS", "No stored messages with fetched content need reprocessing.");
  }

  try {
    const inserted = await getPool().query<RunRow>(
      `INSERT INTO gmail_reprocess_runs
         (id, user_id, connection_id, status, upper_bound_id, total, started_at)
       VALUES ($1, $2, $3, 'running', $4, $5, $6)
       RETURNING ${RUN_COLUMNS}`,
      [randomUUID(), userId, connection.id, upperBoundId, total, startedAt],
    );
    return success(inserted.rows[0]!, `Reprocessing started for ${total} stored message(s).`);
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    if (code === "23505") {
      // A concurrent start won the unique active-run index; reuse that run.
      const existing = await getPool().query<RunRow>(
        `SELECT ${RUN_COLUMNS} FROM gmail_reprocess_runs
          WHERE user_id = $1 AND status IN ('running', 'paused')
          ORDER BY started_at DESC LIMIT 1`,
        [userId],
      );
      if (existing.rows[0]) {
        return success(existing.rows[0], "Reprocessing already has an active run. Resume it instead of starting a new one.");
      }
    }
    throw error;
  }
}

export async function resumeReprocess(
  userId: string,
  runId: string,
): Promise<ReprocessActionResult> {
  await ensureMailSchema();
  if (!getGmailConfig().config) {
    return failure("GMAIL_NOT_CONFIGURED", "Gmail OAuth environment variables are incomplete or invalid.");
  }

  const connection = await getConnectionForUser(userId);
  if (!connection || connection.status === "revoked" || !connection.encryptedRefreshToken) {
    return failure("GMAIL_NOT_CONNECTED", "Reconnect Gmail before resuming reprocessing.");
  }

  const resumed = await getPool().query<RunRow>(
    `UPDATE gmail_reprocess_runs
        SET status = 'running', lease_expires_at = NULL, updated_at = now()
      WHERE id = $1 AND user_id = $2 AND status IN ('paused', 'failed')
      RETURNING ${RUN_COLUMNS}`,
    [runId, userId],
  );
  if (resumed.rows[0]) {
    return success(resumed.rows[0], "Reprocessing resumed from the last saved position.");
  }

  const existing = await getRun(userId, runId);
  if (!existing) return failure("RUN_NOT_FOUND", "This reprocessing run does not belong to the user.");
  if (existing.status === "completed") {
    return success(existing, "This reprocessing run already completed.");
  }
  return success(existing, "Reprocessing is already running.");
}

export async function pauseReprocess(
  userId: string,
  runId: string,
): Promise<ReprocessActionResult> {
  await ensureMailSchema();
  // Do not interrupt a batch that already holds the lease: let it commit, then
  // pause after the request finishes so counters and cursor stay consistent.
  const paused = await getPool().query<RunRow>(
    `UPDATE gmail_reprocess_runs
        SET status = 'paused', lease_expires_at = NULL, updated_at = now()
      WHERE id = $1 AND user_id = $2 AND status = 'running'
        AND (lease_expires_at IS NULL OR lease_expires_at < now())
      RETURNING ${RUN_COLUMNS}`,
    [runId, userId],
  );
  if (paused.rows[0]) {
    return success(paused.rows[0], "Reprocessing paused. Resume to continue from this position.");
  }

  const existing = await getRun(userId, runId);
  if (!existing) return failure("RUN_NOT_FOUND", "This reprocessing run does not belong to the user.");
  if (existing.status === "running") {
    return success(existing, "A batch is still being saved. Press Pause again in a moment.");
  }
  return success(existing, "Reprocessing is not running.");
}

/**
 * Fetches and rewrites the next bounded batch. The run row is leased for two
 * minutes so two requests cannot write the same range concurrently.
 */
export async function processReprocessBatch(
  userId: string,
  runId: string,
): Promise<ReprocessActionResult> {
  await ensureMailSchema();
  if (!getGmailConfig().config) {
    return failure("GMAIL_NOT_CONFIGURED", "Gmail OAuth environment variables are incomplete or invalid.");
  }

  const pool = getPool();
  const leased = await pool.query<RunRow>(
    `UPDATE gmail_reprocess_runs
        SET lease_expires_at = now() + make_interval(secs => $3::int), updated_at = now()
      WHERE id = $1 AND user_id = $2 AND status = 'running'
        AND (lease_expires_at IS NULL OR lease_expires_at < now())
      RETURNING ${RUN_COLUMNS}`,
    [runId, userId, LEASE_SECONDS],
  );
  if (!leased.rows[0]) {
    const existing = await getRun(userId, runId);
    if (!existing) return failure("RUN_NOT_FOUND", "This reprocessing run does not belong to the user.");
    if (existing.status === "completed") {
      return success(existing, "This reprocessing run already completed.");
    }
    if (existing.status === "paused" || existing.status === "failed") {
      return failure("RUN_NOT_RESUMED", "Resume this reprocessing run before fetching more messages.");
    }
    return failure("RUN_BUSY", "Another request is processing this run. Retry in a moment.", existing);
  }
  const run = leased.rows[0];

  const connection = await getConnectionForUser(userId);
  if (
    !connection ||
    connection.id !== run.connection_id ||
    connection.status === "revoked" ||
    !connection.encryptedRefreshToken
  ) {
    const failed = await markRunFailed(userId, runId, "GMAIL_NOT_CONNECTED");
    return failure(
      "GMAIL_NOT_CONNECTED",
      "The Gmail connection is missing or revoked. Reconnect Gmail, then resume.",
      failed,
    );
  }

  let accessToken: string;
  try {
    const token = await refreshAccessToken(decryptToken(connection.encryptedRefreshToken));
    if (!token.access_token) {
      throw Object.assign(new Error("No access token returned."), { code: "TOKEN_REFRESH_EMPTY" });
    }
    accessToken = token.access_token;
  } catch (error) {
    const code = safeDiagnosticCode(error, "TOKEN_REFRESH_FAILED");
    const failed = await markRunFailed(userId, runId, code);
    console.error("[admin:reprocess] token refresh failed", { runId, code });
    return failure(code, "The access token could not be refreshed. The run stopped at the last saved position.", failed);
  }

  const batch = await pool.query<{ id: string; gmail_message_id: string }>(
    `SELECT id, gmail_message_id
       FROM gmail_notifications
      WHERE user_id = $1
        AND content_fetched_at IS NOT NULL
        AND content_fetched_at <= $2
        AND ($3::text IS NULL OR id > $3::text)
        AND ($4::text IS NULL OR id <= $4::text)
      ORDER BY id ASC
      LIMIT $5`,
    [userId, run.started_at, run.cursor_id, run.upper_bound_id, REPROCESS_BATCH_SIZE],
  );

  if (batch.rows.length === 0) {
    const completed = await pool.query<RunRow>(
      `UPDATE gmail_reprocess_runs
          SET status = 'completed', lease_expires_at = NULL,
              completed_at = COALESCE(completed_at, now()), updated_at = now()
        WHERE id = $1 AND user_id = $2 AND status = 'running'
        RETURNING ${RUN_COLUMNS}`,
      [runId, userId],
    );
    const row = completed.rows[0] ?? (await getRun(userId, runId));
    return success(row, "Reprocessing finished.");
  }

  const successes: Array<{ id: string; bodyText: string; snippet: string }> = [];
  let attempted = 0;
  let failedCount = 0;
  let lastId: string | null = null;
  let lastErrorCode: string | null = null;
  let abortCode: string | null = null;

  for (const row of batch.rows) {
    try {
      // Attachments are intentionally excluded: stored attachment rows stay as-is.
      const content = await getMessageContent(accessToken, row.gmail_message_id, {
        includeAttachments: false,
      });
      successes.push({ id: row.id, bodyText: content.bodyText, snippet: content.snippet });
      attempted += 1;
      lastId = row.id;
    } catch (error) {
      const code = safeDiagnosticCode(error, "MESSAGE_FETCH_FAILED");
      const status = (error as { status?: unknown }).status;
      if (AUTH_ABORT_CODES.has(code) || status === 429) {
        abortCode = status === 429 ? "GMAIL_RATE_LIMITED" : code;
        break;
      }
      // A single deleted/broken message must not stall the cursor forever.
      failedCount += 1;
      attempted += 1;
      lastId = row.id;
      lastErrorCode = code;
      console.warn("[admin:reprocess] message failed", { notificationId: row.id, code });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let updatedCount = 0;
    for (const entry of successes) {
      const result = await client.query(
        `UPDATE gmail_notifications
            SET body_text = $3, snippet = $4, content_fetched_at = now()
          WHERE id = $1 AND user_id = $2
            AND (body_text IS DISTINCT FROM $3 OR snippet IS DISTINCT FROM $4)`,
        [entry.id, userId, entry.bodyText, entry.snippet],
      );
      updatedCount += result.rowCount ?? 0;
    }

    const current = await client.query<RunRow>(
      `SELECT ${RUN_COLUMNS} FROM gmail_reprocess_runs
        WHERE id = $1 AND user_id = $2
        FOR UPDATE`,
      [runId, userId],
    );
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      return failure("RUN_NOT_FOUND", "This reprocessing run no longer exists.");
    }

    const next = applyBatchOutcome(toState(current.rows[0]), {
      attempted,
      updated: updatedCount,
      failed: failedCount,
      lastId,
      lastErrorCode: abortCode ?? lastErrorCode,
      fatal: abortCode !== null,
    });

    const saved = await client.query<RunRow>(
      `UPDATE gmail_reprocess_runs
          SET status = $3, processed = $4, updated = $5, failed = $6,
              cursor_id = $7, last_error_code = $8, lease_expires_at = NULL,
              completed_at = CASE WHEN $3 = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING ${RUN_COLUMNS}`,
      [
        runId, userId, next.status, next.processed, next.updated, next.failed,
        next.cursorId, next.lastErrorCode,
      ],
    );
    await client.query("COMMIT");

    const savedRow = saved.rows[0];
    if (!savedRow) {
      return failure("RUN_NOT_FOUND", "This reprocessing run no longer exists.");
    }

    const message =
      next.status === "completed"
        ? "Reprocessing finished."
        : next.status === "failed"
          ? "Reprocessing stopped at the last saved position."
          : `Processed ${next.processed} of ${next.total} message(s).`;
    return { ok: next.status !== "failed", code: abortCode, message, summary: toSummary(savedRow) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    // Release the lease so an immediate retry is not blocked by RUN_BUSY.
    await pool
      .query(
        "UPDATE gmail_reprocess_runs SET lease_expires_at = NULL, updated_at = now() WHERE id = $1 AND user_id = $2",
        [runId, userId],
      )
      .catch(() => undefined);
    const code = safeDiagnosticCode(error, "REPROCESS_BATCH_FAILED");
    console.error("[admin:reprocess] batch failed", { runId, code });
    return failure(code, "The batch could not be saved. No message was skipped; retry to continue.");
  } finally {
    client.release();
  }
}
