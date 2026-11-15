import { z } from "zod";

import {
  AuthError,
  authenticateUser,
  createUserSession,
  hasValidOrigin,
  userCookieOptions,
} from "@/server/auth/user";
import { DatabaseUnavailableError } from "@/server/db/pool";
import { jsonError, jsonOk } from "@/server/http";

const bodySchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().max(200),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function clientKey(request: Request, email: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${email.toLowerCase()}|${forwarded ?? "local"}`;
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Email and password are required.", 400, { code: "VALIDATION_ERROR" });
  }

  if (!rateLimit(clientKey(request, parsed.data.email))) {
    return jsonError("Too many attempts. Try again in a few minutes.", 429, {
      code: "RATE_LIMITED",
    });
  }

  try {
    const user = await authenticateUser(parsed.data.email, parsed.data.password);
    const token = await createUserSession(user.id);
    attempts.delete(clientKey(request, parsed.data.email));
    const response = jsonOk({ user });
    response.cookies.set({ ...userCookieOptions(), value: token });
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    if (error instanceof DatabaseUnavailableError) {
      return jsonError("Accounts are temporarily unavailable.", 503, { code: "DATABASE_UNAVAILABLE" });
    }
    console.error("[auth] login failed:", error instanceof Error ? error.name : "unknown");
    return jsonError("Could not sign in.", 500, { code: "LOGIN_FAILED" });
  }
}
