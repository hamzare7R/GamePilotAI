import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { requireGmailConfig } from "./env";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
export const GMAIL_STATE_COOKIE = "gp_gmail_state";
export const GMAIL_STATE_TTL_SECONDS = 10 * 60;

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const PROFILE_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

export class GmailApiError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "GmailApiError";
    this.code = code;
  }
}

type StatePayload = {
  uid: string;
  exp: number;
  nonce: string;
};

function sign(value: string) {
  const { encryptionKey } = requireGmailConfig();
  return createHmac("sha256", encryptionKey).update(value).digest("base64url");
}

export function createOAuthState(userId: string) {
  const payload: StatePayload = {
    uid: userId,
    exp: Date.now() + GMAIL_STATE_TTL_SECONDS * 1000,
    nonce: randomBytes(16).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Returns the user id the state was issued for, or null when it is invalid. */
export function readOAuthState(value: string | undefined) {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as StatePayload;
    if (typeof payload.uid !== "string" || !Number.isFinite(payload.exp)) return null;
    if (payload.exp <= Date.now()) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export function buildAuthorizationUrl(state: string) {
  const { clientId, redirectUri } = requireGmailConfig();
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

async function requestToken(body: URLSearchParams, code: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; error_description?: string }
      | null;
    const googleError = body?.error ?? "unknown";
    const description = body?.error_description ?? "none";
    console.error(
      `[gmail:token] endpoint failed status=${response.status} google_error=${googleError} description="${description}"`,
    );
    throw new GmailApiError(`Google rejected the token request (${response.status}).`, code);
  }

  const json = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!json?.access_token) {
    throw new GmailApiError("Google returned no access token.", `${code}_EMPTY`);
  }
  return json;
}

export async function exchangeAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = requireGmailConfig();
  return requestToken(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    "TOKEN_EXCHANGE_FAILED",
  );
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireGmailConfig();
  return requestToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
    "TOKEN_REFRESH_FAILED",
  );
}

export async function revokeGoogleToken(token: string) {
  const response = await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  // 400 means the token was already invalid; that still satisfies revocation.
  if (!response.ok && response.status !== 400) {
    throw new GmailApiError(`Google rejected the revoke request (${response.status}).`, "REVOKE_FAILED");
  }
}

export async function fetchGmailProfile(accessToken: string) {
  const response = await fetch(PROFILE_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GmailApiError(`Gmail profile request failed (${response.status}).`, "PROFILE_FAILED");
  }

  const json = (await response.json().catch(() => null)) as { emailAddress?: string } | null;
  const emailAddress = json?.emailAddress?.trim().toLowerCase();
  if (!emailAddress) {
    throw new GmailApiError("Gmail returned no email address.", "PROFILE_EMPTY");
  }
  return { emailAddress };
}
