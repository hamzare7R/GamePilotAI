import { SERVICE_LABELS, type ServiceKey } from "../gmail/service-map";

export const SERVICE_PAGE_SIZE = 20;
export const SERVICE_USER_PAGE_SIZE = 25;

export const SERVICE_SORTS = [
  "users",
  "notifications",
  "first_seen",
  "last_seen",
  "active_gmail",
  "name",
] as const;

export type ServiceSort = (typeof SERVICE_SORTS)[number];
export const DEFAULT_SERVICE_SORT: ServiceSort = "users";

export const SERVICE_USER_SORTS = [
  "last_seen",
  "first_seen",
  "notifications",
  "name",
  "gmail_status",
] as const;

export type ServiceUserSort = (typeof SERVICE_USER_SORTS)[number];
export const DEFAULT_SERVICE_USER_SORT: ServiceUserSort = "last_seen";

export type ServiceListParams = {
  query: string;
  sort: ServiceSort;
  page: number;
};

export type ServiceUserListParams = {
  query: string;
  sort: ServiceUserSort;
  page: number;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parsePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseServiceListParams(params: RawSearchParams): ServiceListParams {
  return {
    query: (firstValue(params.q) ?? "").trim(),
    sort: oneOf(firstValue(params.sort), SERVICE_SORTS, DEFAULT_SERVICE_SORT),
    page: parsePage(firstValue(params.page)),
  };
}

export function parseServiceUserParams(params: RawSearchParams): ServiceUserListParams {
  return {
    query: (firstValue(params.q) ?? "").trim(),
    sort: oneOf(firstValue(params.sort), SERVICE_USER_SORTS, DEFAULT_SERVICE_USER_SORT),
    page: parsePage(firstValue(params.page)),
  };
}

export function isKnownServiceKey(value: string): value is ServiceKey {
  return Object.prototype.hasOwnProperty.call(SERVICE_LABELS, value);
}

export function serviceLabel(value: string) {
  if (value === "other") return "Other / Unknown Senders";
  return isKnownServiceKey(value) ? SERVICE_LABELS[value] : value;
}

export function isSafeServiceName(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);
}

export function matchingServiceKeys(query: string): ServiceKey[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return (Object.keys(SERVICE_LABELS) as ServiceKey[]).filter(
    (key) =>
      key !== "other" &&
      (key.includes(normalized) || SERVICE_LABELS[key].toLowerCase().includes(normalized)),
  );
}

export function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function toAggregateCount(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    throw new Error("Aggregate value is missing.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Aggregate value is invalid.");
  }
  return parsed;
}

export function clampPage(page: number, total: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), pageCount);
  return { page: safePage, pageCount };
}

export function pageWindow(page: number, total: number, pageSize: number) {
  const clamped = clampPage(page, total, pageSize);
  return {
    ...clamped,
    start: total > 0 ? (clamped.page - 1) * pageSize + 1 : 0,
    end: Math.min(clamped.page * pageSize, total),
  };
}

export function buildServiceHref(serviceName: string) {
  return `/admin/services/${encodeURIComponent(serviceName)}`;
}

export function buildServicesHref(input: {
  query: string;
  sort: ServiceSort;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (input.query) search.set("q", input.query);
  if (input.sort !== DEFAULT_SERVICE_SORT) search.set("sort", input.sort);
  if (input.page && input.page > 1) search.set("page", String(input.page));
  const value = search.toString();
  return value ? `/admin/services?${value}` : "/admin/services";
}

export function buildServiceUsersHref(
  serviceName: string,
  input: { query: string; sort: ServiceUserSort; page?: number },
) {
  const base = buildServiceHref(serviceName);
  const search = new URLSearchParams();
  if (input.query) search.set("q", input.query);
  if (input.sort !== DEFAULT_SERVICE_USER_SORT) search.set("sort", input.sort);
  if (input.page && input.page > 1) search.set("page", String(input.page));
  const value = search.toString();
  return value ? `${base}?${value}` : base;
}

export function safeUserLabel(displayName: string, userId: string) {
  const name = displayName.trim();
  const fallback = `User ${userId.slice(0, 8)}`;
  if (!name) return fallback;

  const looksLikeEmail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(name);
  return looksLikeEmail ? fallback : name;
}

const SAFE_ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "DatabaseError",
  "AggregateError",
  "AbortError",
]);

export function safeFailureCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Za-z0-9_]{1,32}$/.test(code)) return code;
  }
  if (error instanceof Error && SAFE_ERROR_NAMES.has(error.name)) return error.name;
  return "UNKNOWN";
}
