import { z } from "zod";

import {
  adminCookieOptions,
  clearLoginAttempts,
  createAdminSessionToken,
  isAdminAuthConfigured,
  loginRateLimiter,
  verifyAdminPassword,
} from "@/server/auth/admin";
import { jsonError, jsonOk } from "@/server/http";

const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return jsonError(
      "Admin access is not configured. Set ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) and ADMIN_SESSION_SECRET.",
      503,
      { code: "ADMIN_NOT_CONFIGURED" },
    );
  }

  const key = clientKey(request);
  const limit = loginRateLimiter(key);
  if (!limit.allowed) {
    return jsonError("Too many sign-in attempts. Try again in a few minutes.", 429, {
      code: "RATE_LIMITED",
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Enter the owner password.", 400, { code: "INVALID_BODY" });
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return jsonError("That password is not correct.", 401, { code: "INVALID_CREDENTIALS" });
  }

  clearLoginAttempts(key);
  const response = jsonOk({ authenticated: true });
  response.cookies.set({ ...adminCookieOptions(), value: createAdminSessionToken() });
  return response;
}

export async function DELETE() {
  const response = jsonOk({ authenticated: false });
  response.cookies.set({ ...adminCookieOptions(), value: "", maxAge: 0 });
  return response;
}
