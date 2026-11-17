export type ServiceKey =
  | "google"
  | "steam"
  | "microsoft"
  | "epic"
  | "playstation"
  | "xbox"
  | "riot"
  | "garena"
  | "pubg"
  | "moonton"
  | "supercell"
  | "roblox"
  | "minecraft"
  | "activision"
  | "ea"
  | "ubisoft"
  | "blizzard"
  | "nintendo"
  | "twitch"
  | "discord"
  | "meta"
  | "tiktok"
  | "linkedin"
  | "snapchat"
  | "reddit"
  | "telegram"
  | "x"
  | "temu"
  | "amazon"
  | "paypal"
  | "github"
  | "gitlab"
  | "vercel"
  | "cloudflare"
  | "openai"
  | "apple"
  | "adobe"
  | "canva"
  | "figma"
  | "tradingview"
  | "binance"
  | "coinbase"
  | "netflix"
  | "spotify"
  | "youtube"
  | "booking"
  | "airbnb"
  | "uber"
  | "dhl"
  | "other";

export type MessageCategory =
  | "security_notification"
  | "login_activity"
  | "account_alert"
  | "password_change_notice"
  | "general_notification"
  | "unknown_sender";

export type ServiceDefinition = {
  key: ServiceKey;
  label: string;
  domains: readonly string[];
  defaultCategory: Exclude<MessageCategory, "unknown_sender">;
};

/**
 * Curated sender-domain registry. Matching is exact or on a dot boundary,
 * so lookalike domains such as "steamcommunity.com.attacker.test" never match.
 * Keep this registry limited to domains belonging to the named service.
 */
export const SERVICE_DEFINITIONS: readonly ServiceDefinition[] = [
  { key: "google", label: "Google", domains: ["google.com", "googlemail.com", "gmail.com"], defaultCategory: "general_notification" },
  { key: "steam", label: "Steam", domains: ["steampowered.com", "steamcommunity.com", "valvesoftware.com"], defaultCategory: "account_alert" },
  { key: "microsoft", label: "Microsoft", domains: ["microsoft.com", "microsoftonline.com", "outlook.com", "live.com"], defaultCategory: "general_notification" },
  { key: "epic", label: "Epic Games", domains: ["epicgames.com"], defaultCategory: "account_alert" },
  { key: "playstation", label: "PlayStation", domains: ["playstation.com", "sonyentertainmentnetwork.com"], defaultCategory: "account_alert" },
  { key: "xbox", label: "Xbox", domains: ["xbox.com", "xboxlive.com"], defaultCategory: "general_notification" },
  { key: "riot", label: "Riot Games", domains: ["riotgames.com", "leagueoflegends.com", "valorant.com"], defaultCategory: "general_notification" },

  // Mobile and PC games
  { key: "garena", label: "Garena / Free Fire", domains: ["garena.com", "garena.sg", "ff.garena.com"], defaultCategory: "account_alert" },
  { key: "pubg", label: "PUBG / PUBG Mobile", domains: ["pubg.com", "pubgmobile.com", "krafton.com"], defaultCategory: "account_alert" },
  { key: "moonton", label: "Moonton / Mobile Legends", domains: ["moonton.com", "mobilelegends.com"], defaultCategory: "account_alert" },
  { key: "supercell", label: "Supercell", domains: ["supercell.com", "clashofclans.com", "clashroyale.com"], defaultCategory: "account_alert" },
  { key: "roblox", label: "Roblox", domains: ["roblox.com"], defaultCategory: "account_alert" },
  { key: "minecraft", label: "Minecraft", domains: ["minecraft.net", "mojang.com"], defaultCategory: "account_alert" },
  { key: "activision", label: "Activision / Call of Duty", domains: ["activision.com", "callofduty.com"], defaultCategory: "account_alert" },
  { key: "ea", label: "EA Games", domains: ["ea.com", "origin.com"], defaultCategory: "account_alert" },
  { key: "ubisoft", label: "Ubisoft", domains: ["ubisoft.com"], defaultCategory: "account_alert" },
  { key: "blizzard", label: "Blizzard / Battle.net", domains: ["blizzard.com", "battle.net"], defaultCategory: "account_alert" },
  { key: "nintendo", label: "Nintendo", domains: ["nintendo.com"], defaultCategory: "account_alert" },
  { key: "twitch", label: "Twitch", domains: ["twitch.tv"], defaultCategory: "general_notification" },

  // Social and communication
  { key: "discord", label: "Discord", domains: ["discord.com", "discordapp.com"], defaultCategory: "general_notification" },
  { key: "meta", label: "Meta / Facebook / Instagram", domains: ["facebook.com", "instagram.com", "meta.com"], defaultCategory: "general_notification" },
  { key: "tiktok", label: "TikTok", domains: ["tiktok.com"], defaultCategory: "general_notification" },
  { key: "linkedin", label: "LinkedIn", domains: ["linkedin.com"], defaultCategory: "account_alert" },
  { key: "snapchat", label: "Snapchat", domains: ["snapchat.com"], defaultCategory: "general_notification" },
  { key: "reddit", label: "Reddit", domains: ["reddit.com"], defaultCategory: "general_notification" },
  { key: "telegram", label: "Telegram", domains: ["telegram.org"], defaultCategory: "general_notification" },
  { key: "x", label: "X", domains: ["x.com", "twitter.com"], defaultCategory: "general_notification" },

  // Shopping and payments
  { key: "temu", label: "Temu", domains: ["temu.com", "temuemail.com"], defaultCategory: "general_notification" },
  { key: "amazon", label: "Amazon", domains: ["amazon.com", "amazon.co.uk", "amazon.de"], defaultCategory: "general_notification" },
  { key: "paypal", label: "PayPal", domains: ["paypal.com"], defaultCategory: "account_alert" },

  // Developer and technology services
  { key: "github", label: "GitHub", domains: ["github.com"], defaultCategory: "general_notification" },
  { key: "gitlab", label: "GitLab", domains: ["gitlab.com"], defaultCategory: "general_notification" },
  { key: "vercel", label: "Vercel", domains: ["vercel.com"], defaultCategory: "general_notification" },
  { key: "cloudflare", label: "Cloudflare", domains: ["cloudflare.com"], defaultCategory: "general_notification" },
  { key: "openai", label: "OpenAI", domains: ["openai.com"], defaultCategory: "general_notification" },
  { key: "apple", label: "Apple", domains: ["apple.com", "icloud.com"], defaultCategory: "account_alert" },
  { key: "adobe", label: "Adobe", domains: ["adobe.com"], defaultCategory: "general_notification" },
  { key: "canva", label: "Canva", domains: ["canva.com"], defaultCategory: "general_notification" },
  { key: "figma", label: "Figma", domains: ["figma.com"], defaultCategory: "general_notification" },

  // Finance and market platforms
  { key: "tradingview", label: "TradingView", domains: ["tradingview.com"], defaultCategory: "general_notification" },
  { key: "binance", label: "Binance", domains: ["binance.com"], defaultCategory: "account_alert" },
  { key: "coinbase", label: "Coinbase", domains: ["coinbase.com"], defaultCategory: "account_alert" },

  // Streaming, travel and delivery
  { key: "netflix", label: "Netflix", domains: ["netflix.com"], defaultCategory: "general_notification" },
  { key: "spotify", label: "Spotify", domains: ["spotify.com"], defaultCategory: "general_notification" },
  { key: "youtube", label: "YouTube", domains: ["youtube.com"], defaultCategory: "general_notification" },
  { key: "booking", label: "Booking.com", domains: ["booking.com"], defaultCategory: "general_notification" },
  { key: "airbnb", label: "Airbnb", domains: ["airbnb.com"], defaultCategory: "general_notification" },
  { key: "uber", label: "Uber", domains: ["uber.com"], defaultCategory: "general_notification" },
  { key: "dhl", label: "DHL", domains: ["dhl.com"], defaultCategory: "general_notification" },
];

export const CATEGORY_LABELS: Record<MessageCategory, string> = {
  security_notification: "Security notification",
  login_activity: "Login activity",
  account_alert: "Account alert",
  password_change_notice: "Password change notice",
  general_notification: "General notification",
  unknown_sender: "Unknown sender",
};

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  google: "Google",
  steam: "Steam",
  microsoft: "Microsoft",
  epic: "Epic Games",
  playstation: "PlayStation",
  xbox: "Xbox",
  riot: "Riot Games",
  garena: "Garena / Free Fire",
  pubg: "PUBG / PUBG Mobile",
  moonton: "Moonton / Mobile Legends",
  supercell: "Supercell",
  roblox: "Roblox",
  minecraft: "Minecraft",
  activision: "Activision / Call of Duty",
  ea: "EA Games",
  ubisoft: "Ubisoft",
  blizzard: "Blizzard / Battle.net",
  nintendo: "Nintendo",
  twitch: "Twitch",
  discord: "Discord",
  meta: "Meta / Facebook / Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  reddit: "Reddit",
  telegram: "Telegram",
  x: "X",
  temu: "Temu",
  amazon: "Amazon",
  paypal: "PayPal",
  github: "GitHub",
  gitlab: "GitLab",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  openai: "OpenAI",
  apple: "Apple",
  adobe: "Adobe",
  canva: "Canva",
  figma: "Figma",
  tradingview: "TradingView",
  binance: "Binance",
  coinbase: "Coinbase",
  netflix: "Netflix",
  spotify: "Spotify",
  youtube: "YouTube",
  booking: "Booking.com",
  airbnb: "Airbnb",
  uber: "Uber",
  dhl: "DHL",
  other: "Other services",
};
