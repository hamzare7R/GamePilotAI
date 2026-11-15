export type ServiceKey =
  | "google"
  | "steam"
  | "microsoft"
  | "epic"
  | "playstation"
  | "xbox"
  | "riot"
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
 * Domain based mapping. Only registrable service domains are listed, and
 * matching is done on a dot boundary so "evil-google.com" never matches
 * "google.com".
 */
export const SERVICE_DEFINITIONS: readonly ServiceDefinition[] = [
  {
    key: "google",
    label: "Google",
    domains: ["google.com", "googlemail.com", "gmail.com", "accounts.google.com"],
    defaultCategory: "security_notification",
  },
  {
    key: "steam",
    label: "Steam",
    domains: ["steampowered.com", "steamcommunity.com", "valvesoftware.com"],
    defaultCategory: "account_alert",
  },
  {
    key: "microsoft",
    label: "Microsoft",
    domains: ["microsoft.com", "microsoftonline.com", "outlook.com", "live.com"],
    defaultCategory: "security_notification",
  },
  {
    key: "epic",
    label: "Epic Games",
    domains: ["epicgames.com", "epicgames.dev"],
    defaultCategory: "account_alert",
  },
  {
    key: "playstation",
    label: "PlayStation",
    domains: ["playstation.com", "sony.com", "sonyentertainmentnetwork.com"],
    defaultCategory: "account_alert",
  },
  {
    key: "xbox",
    label: "Xbox",
    domains: ["xbox.com", "xboxlive.com"],
    defaultCategory: "general_notification",
  },
  {
    key: "riot",
    label: "Riot Games",
    domains: ["riotgames.com", "leagueoflegends.com", "valorant.com"],
    defaultCategory: "general_notification",
  },
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
  other: "Other services",
};
