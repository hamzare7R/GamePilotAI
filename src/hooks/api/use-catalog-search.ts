"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { catalogQueryService } from "@/services/catalog-query.service";
import type { CatalogQueryParams } from "@/types/catalog";

export function useCatalogSearch(params: CatalogQueryParams, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.catalog.search(params),
    queryFn: ({ pageParam, signal }) =>
      catalogQueryService.search({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage && lastPage.items.length > 0
        ? lastPage.pagination.page + 1
        : undefined,
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 400 ? false : failureCount < 2,
  });
}
