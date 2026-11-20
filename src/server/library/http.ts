import { CatalogUnavailableError } from "@/server/catalog/errors";
import { DatabaseUnavailableError } from "@/server/db/pool";
import { jsonError } from "@/server/http";

import {
  LibraryEntryNotFoundError,
  LibraryGameNotFoundError,
  LibraryNotReadyError,
  MockLibraryEntryError,
} from "./errors";

/** Maps internal failures to safe HTTP responses; never leaks SQL, ids, or credentials. */
export function libraryFailure(error: unknown, scope: string) {
  if (error instanceof LibraryNotReadyError) {
    return jsonError("Library storage is not initialized on this deployment.", 503, {
      code: "LIBRARY_STORAGE_NOT_INITIALIZED",
    });
  }
  if (error instanceof DatabaseUnavailableError) {
    return jsonError("Your library is temporarily unavailable.", 503, {
      code: "DATABASE_UNAVAILABLE",
    });
  }
  if (error instanceof LibraryGameNotFoundError) {
    return jsonError("That game is no longer available in the catalog.", 404, {
      code: "GAME_NOT_FOUND",
    });
  }
  if (error instanceof LibraryEntryNotFoundError) {
    return jsonError("That library entry was not found.", 404, {
      code: "LIBRARY_ENTRY_NOT_FOUND",
    });
  }
  if (error instanceof MockLibraryEntryError) {
    return jsonError("Demo catalog games cannot be saved to a library in production.", 403, {
      code: "MOCK_GAME_NOT_SAVABLE",
    });
  }
  if (error instanceof CatalogUnavailableError) {
    return jsonError("The game catalog is temporarily unavailable.", 502, {
      code: "CATALOG_UNAVAILABLE",
    });
  }

  const code = (error as { code?: unknown }).code;
  console.error(
    `[library:${scope}] failed:`,
    typeof code === "string" ? code : error instanceof Error ? error.name : "unknown",
  );
  return jsonError("The library request could not be completed.", 500, {
    code: "LIBRARY_REQUEST_FAILED",
  });
}
