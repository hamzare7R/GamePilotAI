import { cookies } from "next/headers";

import { destroyUserSession, hasValidOrigin, USER_COOKIE_NAME, userCookieOptions } from "@/server/auth/user";
import { jsonError, jsonOk } from "@/server/http";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const store = await cookies();
  const token = store.get(USER_COOKIE_NAME)?.value;

  try {
    if (token) await destroyUserSession(token);
  } catch {
    // The cookie is cleared regardless so the browser cannot keep using it.
  }

  const response = jsonOk({ signedOut: true });
  response.cookies.set({ ...userCookieOptions(), value: "", maxAge: 0 });
  return response;
}
