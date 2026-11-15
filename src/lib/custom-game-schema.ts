import { z } from "zod";

import {
  MAX_IMAGE_URL_LENGTH,
  MAX_SCREENSHOTS,
  validateImageUrl,
  validateLinkUrl,
  type UrlCheck,
} from "@/lib/image-url";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function urlField(check: (value: string) => UrlCheck, label: string) {
  return z
    .string()
    .trim()
    .max(MAX_IMAGE_URL_LENGTH)
    .superRefine((value, ctx) => {
      const result = check(value);
      if (!result.ok) ctx.addIssue({ code: "custom", message: `${label}: ${result.message}` });
    });
}

const imageUrl = urlField(validateImageUrl, "Image");
const linkUrl = urlField(validateLinkUrl, "Link");

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
  coverUrl: imageUrl.default(""),
  heroUrl: imageUrl.default(""),
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
  websiteUrl: linkUrl.default(""),
  trailerUrl: linkUrl.default(""),
  screenshots: z
    .array(imageUrl)
    .max(MAX_SCREENSHOTS, `Up to ${MAX_SCREENSHOTS} screenshots.`)
    .default([]),
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
    coverUrl: imageUrl.optional(),
    heroUrl: imageUrl.optional(),
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
    websiteUrl: linkUrl.optional(),
    trailerUrl: linkUrl.optional(),
    screenshots: z
      .array(imageUrl)
      .max(MAX_SCREENSHOTS, `Up to ${MAX_SCREENSHOTS} screenshots.`)
      .optional(),
    status: customGameStatusSchema.optional(),
  })
  .strict();
