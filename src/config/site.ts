import { env } from "@/lib/env";

export const siteConfig = {
  name: "GamePilot AI",
  tagline: "Your AI co-pilot for every game.",
  description:
    "GamePilot AI is a personal gaming companion that turns your play history into smarter builds, tailored coaching and better sessions.",
  url: env.NEXT_PUBLIC_SITE_URL,
  locale: "en_US",
  keywords: [
    "gaming companion",
    "AI gaming coach",
    "game library",
    "game recommendations",
    "player analytics",
  ],
  links: {
    dashboard: "/dashboard",
  },
} as const;
