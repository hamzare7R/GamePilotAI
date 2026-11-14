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
