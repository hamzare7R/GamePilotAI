import { API_BASE_URL, env } from "@/lib/env";
import type { ApiErrorPayload, ApiResponse, RequestQuery } from "@/types/api";

export type RequestOptions = Omit<RequestInit, "body" | "method"> & {
  query?: RequestQuery;
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(payload: ApiErrorPayload, status: number, requestId?: string) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
    this.requestId = requestId;
  }
}

function resolveUrl(baseUrl: string, path: string, query?: RequestQuery) {
  const isAbsolutePath = /^https?:\/\//i.test(path);
  let url = isAbsolutePath ? path : `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

  if (!/^https?:\/\//i.test(url)) {
    // Relative base URL ("/api") works in the browser; on the server it needs an origin.
    url =
      typeof window === "undefined"
        ? new URL(url, env.NEXT_PUBLIC_SITE_URL).toString()
        : url;
  }

  if (!query) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function toApiErrorPayload(payload: unknown, fallback: string): ApiErrorPayload {
  if (payload && typeof payload === "object") {
    const body = payload as { error?: ApiErrorPayload } & Partial<ApiErrorPayload>;
    if (body.error) return body.error;
    if (typeof body.message === "string") {
      return { message: body.message, code: body.code, details: body.details };
    }
  }
  return { message: fallback };
}

export class ApiClient {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  private async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const { query, body, token, headers, ...init } = options;

    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");
    if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

    const response = await fetch(resolveUrl(this.baseUrl, path, query), {
      ...init,
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }
      throw new ApiError(
        toApiErrorPayload(payload, response.statusText || "Request failed"),
        response.status,
        requestId,
      );
    }

    if (response.status === 204) return undefined as T;

    const payload = (await response.json()) as unknown;

    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as ApiResponse<T>).data;
    }

    return payload as T;
  }

  get<T>(path: string, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("GET", path, options);
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("POST", path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("PUT", path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("PATCH", path, { ...options, body });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("DELETE", path, options);
  }
}

export const apiClient = new ApiClient();
