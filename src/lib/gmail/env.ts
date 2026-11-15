export type GmailConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  pubsubTopic: string;
  pubsubSubscription: string;
  pubsubServiceAccountEmail: string;
  pubsubAudience: string;
  encryptionKey: Buffer;
};

export class GmailConfigError extends Error {
  readonly code = "GMAIL_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "GmailConfigError";
  }
}

const REQUIRED = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_PUBSUB_TOPIC",
  "GOOGLE_PUBSUB_SUBSCRIPTION",
  "GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_PUBSUB_AUDIENCE",
  "GMAIL_TOKEN_ENCRYPTION_KEY",
] as const;

type RequiredName = (typeof REQUIRED)[number];

const PLACEHOLDER_VALUES = new Set([
  "your-client-id",
  "your-client-secret",
  "changeme",
  "change-me",
  "example",
  "todo",
]);

function read(name: RequiredName) {
  const value = process.env[name]?.trim();
  if (!value) return { value: null, reason: `${name} is not set` };
  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) {
    return { value: null, reason: `${name} still holds a placeholder value` };
  }
  return { value, reason: null };
}

/**
 * Reads Gmail integration settings lazily. Reasons never include values, so the
 * result is safe to surface in health checks and server logs.
 */
export function getGmailConfig(): { config: GmailConfig | null; problems: string[] } {
  const problems: string[] = [];
  const values = new Map<RequiredName, string>();

  for (const name of REQUIRED) {
    const { value, reason } = read(name);
    if (!value) {
      problems.push(reason ?? `${name} is invalid`);
      continue;
    }
    values.set(name, value);
  }

  const keyRaw = values.get("GMAIL_TOKEN_ENCRYPTION_KEY");
  let encryptionKey: Buffer | null = null;
  if (keyRaw) {
    try {
      const decoded = Buffer.from(keyRaw, "base64");
      if (decoded.length !== 32) {
        problems.push("GMAIL_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64");
      } else {
        encryptionKey = decoded;
      }
    } catch {
      problems.push("GMAIL_TOKEN_ENCRYPTION_KEY is not valid base64");
    }
  }

  const redirectUri = values.get("GOOGLE_REDIRECT_URI");
  if (redirectUri) {
    try {
      const parsed = new URL(redirectUri);
      const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (parsed.protocol !== "https:" && !local) {
        problems.push("GOOGLE_REDIRECT_URI must use https (except on localhost)");
      }
    } catch {
      problems.push("GOOGLE_REDIRECT_URI is not a valid URL");
    }
  }

  if (problems.length > 0 || !encryptionKey) return { config: null, problems };

  return {
    config: {
      clientId: values.get("GOOGLE_CLIENT_ID")!,
      clientSecret: values.get("GOOGLE_CLIENT_SECRET")!,
      redirectUri: values.get("GOOGLE_REDIRECT_URI")!,
      pubsubTopic: values.get("GOOGLE_PUBSUB_TOPIC")!,
      pubsubSubscription: values.get("GOOGLE_PUBSUB_SUBSCRIPTION")!,
      pubsubServiceAccountEmail: values.get("GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL")!,
      pubsubAudience: values.get("GOOGLE_PUBSUB_AUDIENCE")!,
      encryptionKey,
    },
    problems,
  };
}

export function requireGmailConfig(): GmailConfig {
  const { config, problems } = getGmailConfig();
  if (!config) {
    throw new GmailConfigError(`Gmail integration is not configured: ${problems.join("; ")}.`);
  }
  return config;
}

export function isGmailConfigured() {
  return getGmailConfig().config !== null;
}
