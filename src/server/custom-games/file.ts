import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CustomGame } from "@/types/custom-game";

import { freeFireSeed } from "./seed";
import {
  CustomGameStoreUnavailableError,
  type CustomGameRepository,
} from "./types";

const explicitFile = process.env.CUSTOM_GAMES_FILE?.trim();

function storeFile() {
  return explicitFile || path.join(process.cwd(), ".data", "custom-games.json");
}

function assertWritable() {
  const isServerless = Boolean(process.env.VERCEL);
  const isProduction = process.env.NODE_ENV === "production";

  if (isServerless || (isProduction && !explicitFile)) {
    throw new CustomGameStoreUnavailableError(
      "Custom game storage is not configured. Set DATABASE_URL to a Postgres database.",
    );
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<CustomGame[]> {
  assertWritable();
  const file = storeFile();

  try {
    // The path is runtime-configurable, so Turbopack must not trace it.
    const raw = await readFile(/*turbopackIgnore: true*/ file, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Custom game store is not an array.");
    return parsed as CustomGame[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const seed = [freeFireSeed()];
    await persist(seed);
    return seed;
  }
}

async function persist(games: CustomGame[]) {
  assertWritable();
  const file = storeFile();
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(/*turbopackIgnore: true*/ temp, JSON.stringify(games, null, 2), "utf8");
  await rename(/*turbopackIgnore: true*/ temp, file);
}

async function ensureReady() {
  // The file is the source of truth and is re-read on every call: Next renders
  // admin pages and route handlers from separate module instances in dev.
  return readStore();
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function mutate<T>(change: (games: CustomGame[]) => { games: CustomGame[]; result: T }) {
  return serialize(async () => {
    const games = [...(await ensureReady())];
    const { games: next, result } = change(games);
    await persist(next);
    return result;
  });
}

export const fileCustomGameRepository: CustomGameRepository = {
  async list() {
    const games = await ensureReady();
    return [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async find(id) {
    const games = await ensureReady();
    return games.find((game) => game.id === id) ?? null;
  },

  async findBySlug(slug) {
    const games = await ensureReady();
    return games.find((game) => game.slug === slug) ?? null;
  },

  insert(game) {
    return mutate((games) => ({
      games: [...games, game],
      result: game,
    }));
  },

  update(id, next) {
    return mutate((games) => {
      const index = games.findIndex((game) => game.id === id);
      if (index === -1) return { games, result: null };
      games[index] = next;
      return { games, result: next };
    });
  },

  remove(id) {
    return mutate((games) => {
      const next = games.filter((game) => game.id !== id);
      return { games: next, result: next.length !== games.length };
    });
  },
};
