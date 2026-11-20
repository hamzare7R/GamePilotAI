"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  libraryMembershipKey,
  removeLibraryMembershipEntry,
  setLibraryMembershipStatus,
  upsertLibraryMembership,
  type LibraryMembershipMap,
} from "@/lib/library";
import { libraryService } from "@/services/library.service";
import type { Paginated } from "@/types/api";
import type {
  AddLibraryEntryInput,
  LibraryEntry,
  LibraryMembershipEntry,
  ListLibraryParams,
  UpdateLibraryEntryInput,
} from "@/types/game";

type UpdateLibraryVariables = {
  entryId: string;
  input: UpdateLibraryEntryInput;
};

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 503]);

function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) return false;
  return failureCount < 2;
}

function useUnauthorizedRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  return (error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 401) return;
    const next = `${pathname}${window.location.search}`;
    router.push(`/login?next=${encodeURIComponent(next)}`);
  };
}

function membershipFrom(entries: LibraryMembershipEntry[]): LibraryMembershipMap {
  return new Map(
    entries.map((entry) => [
      libraryMembershipKey(entry.gameSource, entry.gameId),
      entry,
    ]),
  );
}

export function useLibrary(params: ListLibraryParams = {}) {
  return useQuery({
    queryKey: queryKeys.library.list(params),
    queryFn: () => libraryService.list(params),
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useLibraryMembership(enabled = true) {
  return useQuery({
    queryKey: queryKeys.library.membership(),
    queryFn: async () => membershipFrom(await libraryService.membership()),
    enabled,
    retry: shouldRetry,
  });
}

export function useAddToLibrary() {
  const queryClient = useQueryClient();
  const redirectIfUnauthorized = useUnauthorizedRedirect();

  return useMutation({
    mutationFn: (input: AddLibraryEntryInput) => libraryService.add(input),
    onSuccess: (entry) => {
      const membershipKey = queryKeys.library.membership();
      const next = upsertLibraryMembership(
        queryClient.getQueryData<LibraryMembershipMap>(membershipKey),
        {
          entryId: entry.id,
          gameId: entry.gameId,
          gameSource: entry.gameSource,
          status: entry.status,
        },
      );
      if (next) queryClient.setQueryData(membershipKey, next);

      void queryClient.invalidateQueries({ queryKey: membershipKey });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.library.all, "list"],
      });
    },
    onError: redirectIfUnauthorized,
  });
}

export function useUpdateLibraryEntry() {
  const queryClient = useQueryClient();
  const redirectIfUnauthorized = useUnauthorizedRedirect();

  return useMutation({
    mutationFn: ({ entryId, input }: UpdateLibraryVariables) =>
      libraryService.update(entryId, input),
    onMutate: async ({ entryId, input }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.library.all });

      const previousLists = queryClient.getQueriesData<Paginated<LibraryEntry>>({
        queryKey: [...queryKeys.library.all, "list"],
      });
      const previousMembership = queryClient.getQueryData<LibraryMembershipMap>(
        queryKeys.library.membership(),
      );

      for (const [key, page] of previousLists) {
        if (!page) continue;
        queryClient.setQueryData<Paginated<LibraryEntry>>(key, {
          ...page,
          items: page.items.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  status: input.status ?? entry.status,
                  platform:
                    input.platform === null
                      ? undefined
                      : (input.platform ?? entry.platform),
                  progress: input.progress ?? entry.progress,
                  playtimeMinutes: input.playtimeMinutes ?? entry.playtimeMinutes,
                }
              : entry,
          ),
        });
      }

      if (input.status) {
        const next = setLibraryMembershipStatus(previousMembership, entryId, input.status);
        if (next) {
          queryClient.setQueryData(queryKeys.library.membership(), next);
        }
      }

      return { previousLists, previousMembership };
    },
    onError: (error, _variables, context) => {
      context?.previousLists.forEach(([key, page]) =>
        queryClient.setQueryData(key, page),
      );
      if (context?.previousMembership) {
        queryClient.setQueryData(queryKeys.library.membership(), context.previousMembership);
      }
      redirectIfUnauthorized(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.library.all, "list"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.library.membership(),
      });
    },
  });
}

export function useRemoveFromLibrary() {
  const queryClient = useQueryClient();
  const redirectIfUnauthorized = useUnauthorizedRedirect();

  return useMutation({
    mutationFn: (entryId: string) => libraryService.remove(entryId),
    onMutate: async (entryId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.library.all });

      const previousLists = queryClient.getQueriesData<Paginated<LibraryEntry>>({
        queryKey: [...queryKeys.library.all, "list"],
      });
      const previousMembership = queryClient.getQueryData<LibraryMembershipMap>(
        queryKeys.library.membership(),
      );

      for (const [key, page] of previousLists) {
        if (!page) continue;
        queryClient.setQueryData<Paginated<LibraryEntry>>(key, {
          ...page,
          items: page.items.filter((entry) => entry.id !== entryId),
        });
      }

      const nextMembership = removeLibraryMembershipEntry(previousMembership, entryId);
      if (nextMembership) {
        queryClient.setQueryData(queryKeys.library.membership(), nextMembership);
      }

      return { previousLists, previousMembership };
    },
    onError: (error, _entryId, context) => {
      context?.previousLists.forEach(([key, page]) =>
        queryClient.setQueryData(key, page),
      );
      if (context?.previousMembership) {
        queryClient.setQueryData(queryKeys.library.membership(), context.previousMembership);
      }
      redirectIfUnauthorized(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.library.all, "list"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.library.membership(),
      });
    },
  });
}
