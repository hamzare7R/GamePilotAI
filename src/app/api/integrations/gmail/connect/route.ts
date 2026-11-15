import { NextResponse } from "next/server";

import { getGmailConfig } from "@/lib/gmail/env";
import { buildAuthorizationUrl, createOAuthState, GMAIL_STATE_COOKIE, GMAIL_STATE_TTL_SECONDS } from "@/lib/gmail/oauth";
import { getSessionUser } from "@/server/auth/user";
import { gmailFailure } from "@/server/mail/http";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/mail-monitor", request.url));
  }

  try {
    const { config, problems } = getGmailConfig();
    if (!config) {
      return NextResponse.json(
        { error: { message: "Gmail integration is not configured.", code: "GMAIL_NOT_CONFIGURED", details: problems } },
        { status: 503 },
      );
    }

    const state = createOAuthState(user.id);
    const response = NextResponse.redirect(buildAuthorizationUrl(state));
    response.cookies.set({
      name: GMAIL_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/integrations/gmail",
      maxAge: GMAIL_STATE_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    return gmailFailure(error, "connect");
  }
}
