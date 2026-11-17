import { timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isGmailConfigured, requireGmailConfig } from "@/lib/gmail/env";
import { fetchMailboxHistoryId, startInboxWatch } from "@/lib/gmail/gmail-client";
import { exchangeAuthorizationCode, GMAIL_SCOPE, GMAIL_STATE_COOKIE, readOAuthState } from "@/lib/gmail/oauth";
import { encryptToken } from "@/lib/gmail/token-encryption";
import { getSessionUser } from "@/server/auth/user";
import {
  GmailAlreadyLinkedError,
  recordSyncEvent,
  saveConnection,
  setConnectionStatus,
  updateConnectionWatch,
} from "@/server/mail/repository";

function redirectTo(request: Request, status: string) {
  return NextResponse.redirect(new URL(`/mail-monitor?gmail=${encodeURIComponent(status)}`, request.url));
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set({
    name: GMAIL_STATE_COOKIE,
    value: "",
    maxAge: 0,
    path: "/api/integrations/gmail",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/mail-monitor", request.url));

  if (!isGmailConfigured()) return redirectTo(request, "not_configured");
  if (url.searchParams.get("error")) return clearStateCookie(redirectTo(request, "denied"));

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const cookieState = store.get(GMAIL_STATE_COOKIE)?.value;

  // CSRF defence: the query state must match the httpOnly cookie and must have
  // been issued for the currently signed-in user.
  if (!code || !state || !cookieState || !safeEqual(state, cookieState)) {
    return clearStateCookie(redirectTo(request, "invalid_state"));
  }

  const stateUserId = readOAuthState(state);
  if (!stateUserId || stateUserId !== user.id) {
    return clearStateCookie(redirectTo(request, "invalid_state"));
  }

  try {
    const config = requireGmailConfig();
    const tokens = await exchangeAuthorizationCode(code);

    const grantedScopes = new Set((tokens.scope ?? "").split(/\s+/).filter(Boolean));
    if (tokens.scope && !grantedScopes.has(GMAIL_SCOPE)) {
      console.warn("[gmail:callback] required read-only scope was not granted.");
      return clearStateCookie(redirectTo(request, "scope_missing"));
    }

    if (!tokens.refresh_token) {
      // prompt=consent was requested, so this means Google withheld the token.
      console.warn("[gmail:callback] Google returned no refresh token.");
      return clearStateCookie(redirectTo(request, "no_refresh_token"));
    }

    const profile = await fetchMailboxHistoryId(tokens.access_token!);

    const connection = await saveConnection({
      userId: user.id,
      emailAddress: profile.emailAddress,
      encryptedRefreshToken: encryptToken(tokens.refresh_token),
      historyId: profile.historyId,
      watchExpiration: null,
      status: "active",
    });

    try {
      const watch = await startInboxWatch(tokens.access_token!, config.pubsubTopic);
      const expiration = new Date(Number(watch.expiration));
      await updateConnectionWatch({
        connectionId: connection.id,
        historyId: watch.historyId || profile.historyId,
        watchExpiration: Number.isNaN(expiration.getTime()) ? null : expiration,
        status: "active",
      });
      await recordSyncEvent({ connectionId: connection.id, eventType: "watch_created", status: "success" });
    } catch (watchError) {
      const watchCode = (watchError as { code?: unknown }).code;
      await setConnectionStatus(connection.id, "error");
      await recordSyncEvent({
        connectionId: connection.id,
        eventType: "watch_created",
        status: "failed",
        errorCode: typeof watchCode === "string" ? watchCode : "WATCH_FAILED",
      });
      return clearStateCookie(redirectTo(request, "watch_failed"));
    }

    return clearStateCookie(redirectTo(request, "connected"));
  } catch (error) {
    if (error instanceof GmailAlreadyLinkedError) {
      return clearStateCookie(redirectTo(request, "already_linked"));
    }
    const errorCode = (error as { code?: unknown }).code;
    console.error(
      "[gmail:callback] failed:",
      typeof errorCode === "string" ? errorCode : error instanceof Error ? error.name : "unknown",
    );
    return clearStateCookie(redirectTo(request, "failed"));
  }
}
