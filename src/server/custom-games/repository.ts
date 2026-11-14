import { databaseConfigError, getDatabaseConfig } from "@/server/db/config";

import { fileCustomGameRepository } from "./file";
import { createPostgresCustomGameRepository } from "./postgres";
import type { CustomGameRepository } from "./types";

let warnedAboutInvalidUrl = false;

export function getCustomGameRepository(): CustomGameRepository {
  const { config, problems } = getDatabaseConfig();

  if (config) {
    if (problems.length > 0 && !warnedAboutInvalidUrl) {
      warnedAboutInvalidUrl = true;
      // Names and reasons only: never the variable values.
      console.warn(`[custom-games] ignoring invalid database env: ${problems.join("; ")}`);
    }
    return createPostgresCustomGameRepository(config.url);
  }

  // An env var was provided but none of the values is a usable Postgres URL.
  // Fail loudly instead of falling back to dev-only file storage.
  if (problems.length > 0) throw databaseConfigError(problems);

  return fileCustomGameRepository;
}
