import type { NextRequest, NextResponse } from "next/server";

import {
  findUserBySessionToken,
  USER_COOKIE_NAME,
  type SessionUser,
} from "@/server/auth/user";
import { DatabaseUnavailableError, isDatabaseConnectionError } from "@/server/db/pool";
import { jsonError } from "@/server/http";

import { libraryFailure } from "./http";

export type LibrarySession =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/**
 * Strict session read for Library routes: unlike `getSessionUser()`, a database
 * outage surfaces as 503 instead of silently signing the request out.
 */
export async function requireLibrarySession(request: NextRequest): Promise<LibrarySession> {
  const token = request.cookies.get(USER_COOKIE_NAME)?.value;
  if (!token) {
    return {
      ok: false,
      response: jsonError("Sign in to use your library.", 401, { code: "UNAUTHORIZED" }),
    };
  }

  try {
    const user = await findUserBySessionToken(token);
    if (!user) {
      return {
        ok: false,
        response: jsonError("Your session has expired. Sign in again.", 401, {
          code: "UNAUTHORIZED",
        }),
      };
    }
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      response: libraryFailure(
        isDatabaseConnectionError(error)
          ? new DatabaseUnavailableError("The library database could not be reached.")
          : error,
        "session",
      ),
    };
  }
}
