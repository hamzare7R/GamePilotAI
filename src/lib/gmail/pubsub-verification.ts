import { createRemoteJWKSet, jwtVerify } from "jose";

import { requireGmailConfig } from "./env";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const PUBSUB_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export class PubSubVerificationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "PubSubVerificationError";
    this.code = code;
  }
}

export type PubSubNotification = {
  emailAddress: string;
  historyId: string;
  messageId: string;
};

function subscriptionMatches(expected: string, received: string) {
  const normalize = (value: string) => value.trim().replace(/^\/+/, "");
  const left = normalize(expected);
  const right = normalize(received);
  return right === left || right.endsWith(`/subscriptions/${left.split("/").pop()}`);
}

/**
 * Verifies a Pub/Sub push request end to end:
 * 1. Google-signed OIDC bearer token (issuer, audience, signature via JWKS).
 * 2. The signing service account.
 * 3. The subscription the message actually came from.
 * 4. The message envelope and its base64 payload.
 *
 * The email address inside the payload is only a lookup key; callers must map
 * it to a stored connection before trusting anything.
 */
export async function verifyPubSubPush(request: Request): Promise<PubSubNotification> {
  const config = requireGmailConfig();

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    throw new PubSubVerificationError("Missing Pub/Sub bearer token.", "TOKEN_MISSING");
  }

  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: PUBSUB_ISSUERS,
      audience: config.pubsubAudience,
    });
    payload = verified.payload;
  } catch {
    throw new PubSubVerificationError("Pub/Sub token failed verification.", "TOKEN_INVALID");
  }

  if (payload.email !== config.pubsubServiceAccountEmail || payload.email_verified !== true) {
    throw new PubSubVerificationError(
      "Pub/Sub token was not issued for the expected service account.",
      "SERVICE_ACCOUNT_MISMATCH",
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { message?: { data?: string; messageId?: string }; subscription?: string }
    | null;

  if (!body?.message?.data || !body.message.messageId || !body.subscription) {
    throw new PubSubVerificationError("Pub/Sub envelope is malformed.", "ENVELOPE_INVALID");
  }

  if (!subscriptionMatches(config.pubsubSubscription, body.subscription)) {
    throw new PubSubVerificationError("Pub/Sub message came from an unexpected subscription.", "SUBSCRIPTION_MISMATCH");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf8"));
  } catch {
    throw new PubSubVerificationError("Pub/Sub payload is not valid JSON.", "PAYLOAD_INVALID");
  }

  const data = decoded as { emailAddress?: unknown; historyId?: unknown };
  if (typeof data.emailAddress !== "string" || typeof data.historyId !== "string" || !data.historyId) {
    throw new PubSubVerificationError("Pub/Sub payload is missing emailAddress or historyId.", "PAYLOAD_INVALID");
  }

  return {
    emailAddress: data.emailAddress.trim().toLowerCase(),
    historyId: data.historyId,
    messageId: body.message.messageId,
  };
}
