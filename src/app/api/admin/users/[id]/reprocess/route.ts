import { requireAdmin } from "@/server/auth/admin";
import {
  getLatestReprocessSummary,
  pauseReprocess,
  processReprocessBatch,
  resumeReprocess,
  startReprocess,
  type ReprocessActionResult,
} from "@/server/admin/reprocess";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ["start", "resume", "batch", "pause"] as const;
type ReprocessAction = (typeof ACTIONS)[number];

const RUN_ACTIONS: ReadonlySet<ReprocessAction> = new Set(["resume", "batch", "pause"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return jsonError("Invalid identifier.", 400, { code: "INVALID_ID" });
  }

  return jsonOk({ summary: await getLatestReprocessSummary(id) });
}

/**
 * Manual owner action. "batch" processes a bounded number of messages; the
 * client calls it repeatedly and may stop at any point without losing progress.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return jsonError("Invalid identifier.", 400, { code: "INVALID_ID" });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; runId?: unknown }
    | null;
  const action = body?.action;
  if (typeof action !== "string" || !ACTIONS.includes(action as ReprocessAction)) {
    return jsonError("Choose a valid reprocessing action.", 400, { code: "INVALID_ACTION" });
  }
  const typedAction = action as ReprocessAction;

  let runId: string | null = null;
  if (RUN_ACTIONS.has(typedAction)) {
    runId = typeof body?.runId === "string" ? body.runId : null;
    if (!runId || !UUID_PATTERN.test(runId)) {
      return jsonError("A valid run identifier is required.", 400, { code: "INVALID_RUN_ID" });
    }
  }

  let result: ReprocessActionResult;
  if (typedAction === "start") result = await startReprocess(id);
  else if (typedAction === "resume") result = await resumeReprocess(id, runId!);
  else if (typedAction === "pause") result = await pauseReprocess(id, runId!);
  else result = await processReprocessBatch(id, runId!);

  return jsonOk(result);
}
