import { NextResponse } from "next/server";

import type { ApiErrorPayload, ApiResponse } from "@/types/api";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data } satisfies ApiResponse<T>, init);
}

export function jsonError(
  message: string,
  status = 400,
  extra: Omit<ApiErrorPayload, "message"> = {},
) {
  return NextResponse.json({ error: { message, ...extra } }, { status });
}
