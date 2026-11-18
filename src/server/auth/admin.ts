import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { jsonError } from "@/server/http";

export const ADMIN_COOKIE_NAME = "gp_admin";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

type SessionPayload = {
  sub: "owner";
  exp: number;
};

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

export function isAdminAuthConfigured() {
  return Boolean(sessionSecret()) && Boolean(passwordHash() || process.env.ADMIN_PASSWORD);
}

function passwordHash() {
  return process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * `ADMIN_PASSWORD_HASH` wins over the plaintext `ADMIN_PASSWORD` fallback and
 * must be produced by `npm run admin:hash`.
 */
export function verifyAdminPassword(password: string) {
  const stored = passwordHash();
  if (stored) {
    const [scheme, saltHex, hashHex] = stored.split(":");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    try {
      const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
      return safeEqual(derived, hashHex);
    } catch {
      return false;
    }
  }

  const plain = process.env.ADMIN_PASSWORD ?? "";
  return plain.length > 0 && safeEqual(password, plain);
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createAdminSessionToken() {
  const payload: SessionPayload = {
    sub: "owner",
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token || !sessionSecret()) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  if (!safeEqual(sign(encoded), signature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    return payload.sub === "owner" && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function adminCookieOptions() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  };
}

export async function hasAdminSession() {
  const store = await cookies();
  return verifyAdminSessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}

/** Verified session metadata for the owner console header. */
export async function getAdminSessionInfo(): Promise<{ expiresAt: string } | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !verifyAdminSessionToken(token)) return null;

  const [encoded] = token.split(".");
  if (!encoded) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    if (!Number.isFinite(payload.exp)) return null;
    return { expiresAt: new Date(payload.exp).toISOString() };
  } catch {
    return null;
  }
}

function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Server-side gate for every admin API route. Returns a ready-to-send error
 * response when the caller is not an authenticated owner.
 */
export async function requireAdmin(request: Request): Promise<Response | null> {
  if (!isAdminAuthConfigured()) {
    return jsonError("Admin access is not configured on this deployment.", 503, {
      code: "ADMIN_NOT_CONFIGURED",
    });
  }

  if (!(await hasAdminSession())) {
    return jsonError("Sign in as the owner to manage the custom catalog.", 401, {
      code: "UNAUTHORIZED",
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD" && !hasValidOrigin(request)) {
    return jsonError("Cross-origin admin requests are not allowed.", 403, {
      code: "INVALID_ORIGIN",
    });
  }

  return null;
}

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimiter(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { allowed: true as const };
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return { allowed: false as const, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true as const };
}

export function clearLoginAttempts(key: string) {
  loginAttempts.delete(key);
}
