import type { RequestQuery } from "@/types/api";

export function toQuery(params: object): RequestQuery {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  ) as RequestQuery;
}
