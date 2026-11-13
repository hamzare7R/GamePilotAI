import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { toQuery } from "@/lib/api/query";
import type { Paginated } from "@/types/api";
import type {
  AddLibraryEntryInput,
  LibraryEntry,
  ListLibraryParams,
  UpdateLibraryEntryInput,
} from "@/types/game";

export const libraryService = {
  list(params: ListLibraryParams = {}) {
    return apiClient.get<Paginated<LibraryEntry>>(endpoints.library.list, {
      query: toQuery(params),
    });
  },

  add(input: AddLibraryEntryInput) {
    return apiClient.post<LibraryEntry>(endpoints.library.list, input);
  },

  update(entryId: string, input: UpdateLibraryEntryInput) {
    return apiClient.patch<LibraryEntry>(endpoints.library.detail(entryId), input);
  },

  remove(entryId: string) {
    return apiClient.delete<void>(endpoints.library.detail(entryId));
  },
};
