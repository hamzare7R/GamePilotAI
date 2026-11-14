import type { CustomGame } from "@/types/custom-game";

export type CustomGameRepository = {
  list(): Promise<CustomGame[]>;
  find(id: string): Promise<CustomGame | null>;
  findBySlug(slug: string): Promise<CustomGame | null>;
  insert(game: CustomGame): Promise<CustomGame>;
  update(id: string, next: CustomGame): Promise<CustomGame | null>;
  remove(id: string): Promise<boolean>;
};

export class CustomGameStoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomGameStoreUnavailableError";
  }
}

/**
 * Safe, log-friendly summary of a store failure. Never includes connection
 * strings or other credentials that may be embedded in driver errors.
 */
export function describeStoreError(error: unknown): string {
  if (error instanceof CustomGameStoreUnavailableError) return error.message;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code) return `database error ${code}`;
  return error instanceof Error ? error.name : "unknown error";
}

export class DuplicateCustomGameError extends Error {
  readonly field: "name" | "slug";
  readonly source: "custom" | "rawg";

  constructor(message: string, field: "name" | "slug", source: "custom" | "rawg") {
    super(message);
    this.name = "DuplicateCustomGameError";
    this.field = field;
    this.source = source;
  }
}
