import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { getPool } from "@/server/db/pool";

export const USER_COOKIE_NAME = "gp_session";
export const USER_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export class AuthError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

const CREATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    display_name text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
  CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at);
`;

let schemaReady: Promise<void> | null = null;

export async function ensureUserSchema() {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(CREATE_SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const SCRYPT_KEY_LENGTH = 64;

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  try {
    const derived = scryptSync(password, Buffer.from(saltHex, "hex"), SCRYPT_KEY_LENGTH);
    return safeEqual(derived, Buffer.from(hashHex, "hex"));
  } catch {
    return false;
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
};

function toUser(row: Pick<UserRow, "id" | "email" | "display_name">): SessionUser {
  return { id: row.id, email: row.email, displayName: row.display_name };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string;
}) {
  await ensureUserSchema();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName?.trim() ?? "";
  const passwordHash = hashPassword(input.password);

  const result = await getPool().query<Pick<UserRow, "id" | "email" | "display_name">>(
    `INSERT INTO users (id, email, password_hash, display_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, display_name`,
    [randomUUID(), email, passwordHash, displayName],
  );

  const row = result.rows[0];
  if (!row) throw new AuthError("An account with this email already exists.", "EMAIL_TAKEN", 409);
  return toUser(row);
}

export async function authenticateUser(email: string, password: string) {
  await ensureUserSchema();
  const result = await getPool().query<UserRow>(
    `SELECT id, email, display_name, password_hash FROM users WHERE email = $1 LIMIT 1`,
    [normalizeEmail(email)],
  );
  const row = result.rows[0];
  if (!row) {
    // Spend comparable work so response time does not reveal registered emails.
    scryptSync(password, "gamepilot-missing-account", SCRYPT_KEY_LENGTH);
    throw new AuthError("Email or password is incorrect.", "INVALID_CREDENTIALS", 401);
  }
  if (!verifyPassword(password, row.password_hash)) {
    throw new AuthError("Email or password is incorrect.", "INVALID_CREDENTIALS", 401);
  }
  return toUser(row);
}

export async function createUserSession(userId: string) {
  await ensureUserSchema();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + USER_SESSION_TTL_SECONDS * 1000);

  await getPool().query(`INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, [
    hashToken(token),
    userId,
    expiresAt,
  ]);

  return token;
}

export async function destroyUserSession(token: string) {
  await ensureUserSchema();
  await getPool().query(`DELETE FROM user_sessions WHERE token_hash = $1`, [hashToken(token)]);
}

export async function findUserBySessionToken(token: string | undefined) {
  if (!token) return null;
  await ensureUserSchema();
  const result = await getPool().query<Pick<UserRow, "id" | "email" | "display_name">>(
    `SELECT u.id, u.email, u.display_name
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()
      LIMIT 1`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

/** Server-only: reads the httpOnly session cookie for Server Components. */
export async function getSessionUser() {
  const store = await cookies();
  try {
    return await findUserBySessionToken(store.get(USER_COOKIE_NAME)?.value);
  } catch {
    // A database outage must not break public pages that merely render the nav.
    return null;
  }
}

export function userCookieOptions() {
  return {
    name: USER_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  };
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite). */
export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
