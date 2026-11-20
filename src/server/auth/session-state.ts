import type { AuthState } from "@/types/auth";

import { findUserBySessionToken, type SessionUser } from "./user";

export type SessionState =
  | { state: "authenticated"; user: SessionUser }
  | { state: Exclude<AuthState, "authenticated"> };

/**
 * Strict session read for pages that must not confuse a database outage with a
 * signed-out visitor. Unlike `getSessionUser()`, failures surface as `unavailable`.
 */
export async function resolveSessionState(token: string | undefined): Promise<SessionState> {
  if (!token) return { state: "unauthenticated" };

  try {
    const user = await findUserBySessionToken(token);
    return user ? { state: "authenticated", user } : { state: "unauthenticated" };
  } catch {
    return { state: "unavailable" };
  }
}
