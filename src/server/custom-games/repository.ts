import { fileCustomGameRepository } from "./file";
import { postgresCustomGameRepository } from "./postgres";
import type { CustomGameRepository } from "./types";

export function getCustomGameRepository(): CustomGameRepository {
  if (process.env.DATABASE_URL?.trim()) return postgresCustomGameRepository;
  return fileCustomGameRepository;
}
