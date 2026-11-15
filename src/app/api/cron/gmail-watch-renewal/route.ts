import { timingSafeEqual } from "node:crypto";

import { requireGmailConfig, isGmailConfigured } from "@/lib/gmail/env";
import { renewConnectionWatch, syncConnection } from "@/lib/gmail/notification-sync";
import { jsonError, jsonOk } from "@/server/http";
import { listConnectionsDueForRenewal, listStaleConnections } from "@/server/mail/repository";

const RENEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const STALE_AFTER_MS = 60 * 60 * 1000;
const BATCH_SIZE = 25;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return { ok: false as const, configured: false };
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  const ok = expected.length === received.length && timingSafeEqual(expected, received);
  return { ok, configured: true };
}

export async function GET(request: Request) {
  const auth = authorized(request);
  if (!auth.configured) {
    return jsonError("Cron is not configured.", 503, { code: "CRON_NOT_CONFIGURED" });
  }
  if (!auth.ok) {
    return jsonError("Unauthorized cron request.", 401, { code: "UNAUTHORIZED" });
  }
  if (!isGmailConfigured()) {
    return jsonError("Gmail integration is not configured.", 503, { code: "GMAIL_NOT_CONFIGURED" });
  }

  try {
    const { pubsubTopic } = requireGmailConfig();

    let renewed = 0;
    let renewalFailures = 0;
    for (const connection of await listConnectionsDueForRenewal(RENEW_WINDOW_MS, BATCH_SIZE)) {
      const result = await renewConnectionWatch(connection, pubsubTopic);
      if (result.ok) renewed += 1;
      else renewalFailures += 1;
    }

    // Safety net for dropped or delayed Pub/Sub deliveries.
    let synced = 0;
    let syncFailures = 0;
    for (const connection of await listStaleConnections(STALE_AFTER_MS, BATCH_SIZE)) {
      const result = await syncConnection(connection);
      if (result.status === "ok") synced += 1;
      else if (result.status === "failed") syncFailures += 1;
    }

    return jsonOk({ renewed, renewalFailures, synced, syncFailures });
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    console.error("[gmail:cron] failed:", typeof code === "string" ? code : "unknown");
    return jsonError("Cron run failed.", 500, { code: "CRON_FAILED" });
  }
}
