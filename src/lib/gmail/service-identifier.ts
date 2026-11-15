import {
  SERVICE_DEFINITIONS,
  type MessageCategory,
  type ServiceDefinition,
  type ServiceKey,
} from "./service-map";

export type ServiceMatch = {
  service: ServiceKey;
  label: string;
  category: MessageCategory;
  matchedDomain: string | null;
};

function matchesDomain(domain: string, candidate: string) {
  return domain === candidate || domain.endsWith(`.${candidate}`);
}

function findService(domain: string): { definition: ServiceDefinition; matchedDomain: string } | null {
  if (!domain) return null;
  for (const definition of SERVICE_DEFINITIONS) {
    for (const candidate of definition.domains) {
      if (matchesDomain(domain, candidate)) return { definition, matchedDomain: candidate };
    }
  }
  return null;
}

const PASSWORD_HINTS = ["password", "passwort", "passwd"];
const LOGIN_HINTS = ["login", "signin", "sign-in", "newdevice", "new-device"];
const SECURITY_HINTS = ["security", "secure", "alert", "verify", "verification"];

/**
 * Classifies a message using only the sender address and domain. The subject is
 * deliberately ignored: it is not fetched at all, because it often contains
 * one-time codes.
 */
export function identifyService(senderAddress: string, senderDomain: string): ServiceMatch {
  const domain = senderDomain.trim().toLowerCase();
  const localPart = (senderAddress.split("@")[0] ?? "").toLowerCase();

  const match = findService(domain);
  if (!match) {
    return { service: "other", label: "Other services", category: "unknown_sender", matchedDomain: null };
  }

  let category: MessageCategory = match.definition.defaultCategory;

  if (PASSWORD_HINTS.some((hint) => localPart.includes(hint))) {
    category = "password_change_notice";
  } else if (LOGIN_HINTS.some((hint) => localPart.includes(hint))) {
    category = "login_activity";
  } else if (SECURITY_HINTS.some((hint) => localPart.includes(hint))) {
    category = "security_notification";
  }

  return {
    service: match.definition.key,
    label: match.definition.label,
    category,
    matchedDomain: match.matchedDomain,
  };
}
