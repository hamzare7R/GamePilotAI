import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().trim().min(1).default("/api"),
  NEXT_PUBLIC_SITE_URL: z.string().trim().min(1).default("http://localhost:3000"),
});

export const env = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export const API_BASE_URL = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
