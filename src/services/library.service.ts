import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { toQuery } from "@/lib/api/query";
import type { Paginated } from "@/types/api";
import type {
  AddLibraryEntryInput,
  LibraryEntry,
  LibraryMembershipEntry,
  ListLibraryParams,
  UpdateLibraryEntryInput,
} from "@/types/game";

export const libraryService = {
  list(params: ListLibraryParams = {}) {
    return apiClient.get<Paginated<LibraryEntry>>(endpoints.library.list, {
      query: toQuery(params),
    });
  },

  membership() {
    return apiClient.get<LibraryMembershipEntry[]>(endpoints.library.membership);
  },

  add(input: AddLibraryEntryInput) {
    return apiClient.post<LibraryEntry>(endpoints.library.list, input);
  },

  update(entryId: string, input: UpdateLibraryEntryInput) {
    return apiClient.patch<LibraryEntry>(endpoints.library.detail(entryId), input);
  },

  remove(entryId: string) {
    return apiClient.delete<{ removed: boolean }>(endpoints.library.detail(entryId));
  },
};
