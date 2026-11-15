import { GmailConfigError } from "@/lib/gmail/env";
import { processPubSubNotification } from "@/lib/gmail/notification-sync";
import { PubSubVerificationError, verifyPubSubPush } from "@/lib/gmail/pubsub-verification";
import { jsonError, jsonOk } from "@/server/http";

/**
 * Pub/Sub push endpoint. Every request is authenticated with a Google-signed
 * OIDC token; unauthenticated or mismatched requests are rejected.
 */
export async function POST(request: Request) {
  try {
    const notification = await verifyPubSubPush(request);
    const result = await processPubSubNotification(notification);
    return jsonOk({ status: result.status, processed: result.processed, skipped: result.skipped });
  } catch (error) {
    if (error instanceof GmailConfigError) {
      console.error("[gmail:pubsub] rejected: integration not configured");
      return jsonError("Integration is not configured.", 503, { code: "GMAIL_NOT_CONFIGURED" });
    }
    if (error instanceof PubSubVerificationError) {
      // Log the reason code only: the payload may contain user addresses.
      console.warn("[gmail:pubsub] rejected request:", error.code);
      return jsonError("Invalid Pub/Sub request.", 401, { code: error.code });
    }

    const code = (error as { code?: unknown }).code;
    console.error("[gmail:pubsub] processing failed:", typeof code === "string" ? code : "unknown");
    // A 5xx asks Pub/Sub to redeliver; the message id claim keeps it idempotent.
    return jsonError("Gmail notification processing failed.", 500, { code: "PUBSUB_PROCESSING_FAILED" });
  }
}
