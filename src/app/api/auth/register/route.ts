import { z } from "zod";

import { AuthError, createUserSession, hasValidOrigin, registerUser, userCookieOptions } from "@/server/auth/user";
import { DatabaseUnavailableError } from "@/server/db/pool";
import { jsonError, jsonOk } from "@/server/http";

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  displayName: z.string().trim().max(60).optional(),
});

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return jsonError("Cross-origin requests are not allowed.", 403, { code: "INVALID_ORIGIN" });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Check the highlighted fields.", 400, {
      code: "VALIDATION_ERROR",
      details: z.flattenError(parsed.error).fieldErrors,
    });
  }

  try {
    const user = await registerUser(parsed.data);
    const token = await createUserSession(user.id);
    const response = jsonOk({ user }, { status: 201 });
    response.cookies.set({ ...userCookieOptions(), value: token });
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.message, error.status, { code: error.code });
    }
    if (error instanceof DatabaseUnavailableError) {
      return jsonError("Accounts are temporarily unavailable.", 503, { code: "DATABASE_UNAVAILABLE" });
    }
    console.error("[auth] register failed:", error instanceof Error ? error.name : "unknown");
    return jsonError("Could not create the account.", 500, { code: "REGISTER_FAILED" });
  }
}
