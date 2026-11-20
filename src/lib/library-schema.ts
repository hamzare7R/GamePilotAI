import { z } from "zod";

import {
  LIBRARY_DEFAULT_PAGE_SIZE,
  LIBRARY_MAX_PAGE,
  LIBRARY_MAX_PAGE_SIZE,
  LIBRARY_STATUSES,
} from "@/types/game";

const GAME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const ENTRY_ID_PATTERN = /^[0-9a-f-]{36}$/i;

export const libraryStatusSchema = z.enum(LIBRARY_STATUSES);

export const libraryGameSourceSchema = z.enum(["rawg", "custom", "mock"]);

export const libraryPlatformSchema = z.enum([
  "pc",
  "playstation",
  "xbox",
  "switch",
  "android",
  "ios",
  "cloud",
]);

export const libraryGameIdSchema = z
  .string()
  .trim()
  .regex(GAME_ID_PATTERN, "Invalid game id.");

export const libraryEntryIdSchema = z
  .string()
  .trim()
  .regex(ENTRY_ID_PATTERN, "Invalid library entry id.");

export const libraryListQuerySchema = z.object({
  status: libraryStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  platform: libraryPlatformSchema.optional(),
  page: z.coerce.number().int().min(1).max(LIBRARY_MAX_PAGE).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIBRARY_MAX_PAGE_SIZE)
    .default(LIBRARY_DEFAULT_PAGE_SIZE),
});

export const addLibraryEntrySchema = z
  .object({
    gameId: libraryGameIdSchema,
    platform: libraryPlatformSchema.optional(),
    status: libraryStatusSchema.default("backlog"),
  })
  .strict();

export const updateLibraryEntrySchema = z
  .object({
    status: libraryStatusSchema.optional(),
    platform: libraryPlatformSchema.nullable().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    playtimeMinutes: z.number().int().min(0).max(100_000_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type LibraryListQuery = z.infer<typeof libraryListQuerySchema>;
export type AddLibraryEntryPayload = z.infer<typeof addLibraryEntrySchema>;
export type UpdateLibraryEntryPayload = z.infer<typeof updateLibraryEntrySchema>;
