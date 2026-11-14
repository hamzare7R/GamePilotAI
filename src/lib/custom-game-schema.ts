import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const assetUrl = z
  .string()
  .trim()
  .max(600)
  .refine(
    (value) => value === "" || /^https?:\/\//i.test(value) || value.startsWith("/"),
    "Use an https:// URL or a site-relative path.",
  );

const plainText = (max: number) => z.string().trim().max(max);

export const platformSchema = z.enum([
  "pc",
  "playstation",
  "xbox",
  "switch",
  "android",
  "ios",
  "cloud",
]);

export const genreSchema = z.enum([
  "action",
  "adventure",
  "rpg",
  "shooter",
  "strategy",
  "sports",
  "racing",
  "simulation",
  "horror",
  "puzzle",
  "mmo",
  "indie",
  "survival",
  "open-world",
  "multiplayer",
  "other",
]);

export const customGameStatusSchema = z.enum(["published", "draft", "archived"]);

export const customGameInputSchema = z.object({
  name: plainText(120).min(1, "A name is required."),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only.")
    .optional()
    .or(z.literal("")),
  description: plainText(6000).default(""),
  coverUrl: assetUrl.default(""),
  heroUrl: assetUrl.default(""),
  developer: plainText(120).default(""),
  publisher: plainText(120).default(""),
  releaseDate: z
    .string()
    .trim()
    .refine((value) => value === "" || DATE_PATTERN.test(value), "Use a YYYY-MM-DD date.")
    .optional()
    .or(z.literal("")),
  rating: z.number().min(0).max(10).optional(),
  genres: z.array(genreSchema).max(8).default([]),
  platforms: z.array(platformSchema).min(1, "Pick at least one platform.").max(7),
  websiteUrl: assetUrl.default(""),
  trailerUrl: assetUrl.default(""),
  screenshots: z.array(assetUrl).max(12).default([]),
  status: customGameStatusSchema.default("draft"),
});

export type CustomGameInputSchema = z.infer<typeof customGameInputSchema>;

/**
 * Update schema is built without defaults on purpose: partial updates must not
 * reset omitted fields (a `.partial()` on a schema with defaults would).
 */
export const customGameUpdateSchema = z
  .object({
    name: plainText(120).min(1, "A name is required.").optional(),
    slug: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only.")
      .optional(),
    description: plainText(6000).optional(),
    coverUrl: assetUrl.optional(),
    heroUrl: assetUrl.optional(),
    developer: plainText(120).optional(),
    publisher: plainText(120).optional(),
    releaseDate: z
      .string()
      .trim()
      .refine((value) => value === "" || DATE_PATTERN.test(value), "Use a YYYY-MM-DD date.")
      .optional(),
    rating: z.number().min(0).max(10).optional(),
    genres: z.array(genreSchema).max(8).optional(),
    platforms: z.array(platformSchema).min(1, "Pick at least one platform.").max(7).optional(),
    websiteUrl: assetUrl.optional(),
    trailerUrl: assetUrl.optional(),
    screenshots: z.array(assetUrl).max(12).optional(),
    status: customGameStatusSchema.optional(),
  })
  .strict();
