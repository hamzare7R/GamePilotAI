import { GmailConfigError } from "@/lib/gmail/env";
import { DatabaseUnavailableError } from "@/server/db/pool";
import { jsonError } from "@/server/http";

/** Maps internal failures to safe HTTP responses; never leaks tokens or SQL. */
export function gmailFailure(error: unknown, scope: string) {
  if (error instanceof GmailConfigError) {
    return jsonError("Gmail integration is not configured on this deployment.", 503, {
      code: "GMAIL_NOT_CONFIGURED",
    });
  }
  if (error instanceof DatabaseUnavailableError) {
    return jsonError("Gmail data is temporarily unavailable.", 503, { code: "DATABASE_UNAVAILABLE" });
  }

  const code = (error as { code?: unknown }).code;
  console.error(`[gmail:${scope}] failed:`, typeof code === "string" ? code : error instanceof Error ? error.name : "unknown");
  return jsonError("The Gmail request could not be completed.", 500, { code: "GMAIL_REQUEST_FAILED" });
}
