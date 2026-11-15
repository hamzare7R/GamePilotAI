export const MAX_IMAGE_URL_LENGTH = 2048;
export const MAX_SCREENSHOTS = 12;
export const SUPPORTED_IMAGE_FORMATS = ["JPG", "JPEG", "PNG", "WEBP", "GIF"] as const;
export const IMAGE_URL_HINT = "Direct https:// links only · JPG, JPEG, PNG, WEBP or GIF";

export type UrlCheck = { ok: true } | { ok: false; message: string };

function invalid(message: string): UrlCheck {
  return { ok: false, message };
}

function hasUnsafeCharacters(value: string) {
  return /\s/.test(value) || /[\u0000-\u001f]/.test(value);
}

/**
 * Owner-supplied artwork must be a direct HTTPS image URL or a site-relative
 * asset. Credentials in the URL are rejected so they never reach the browser.
 */
export function validateImageUrl(value: string): UrlCheck {
  const raw = value.trim();
  if (!raw) return { ok: true };

  if (raw.length > MAX_IMAGE_URL_LENGTH) {
    return invalid(`Keep the image URL under ${MAX_IMAGE_URL_LENGTH.toLocaleString("en-US")} characters.`);
  }
  if (hasUnsafeCharacters(raw)) return invalid("The URL cannot contain spaces or control characters.");

  // Site-managed assets (placeholders and bundled art) are always allowed.
  if (raw.startsWith("/")) return { ok: true };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return invalid("Enter a valid https:// image URL.");
  }

  if (url.protocol !== "https:") return invalid("Image URLs must start with https://.");
  if (!url.hostname) return invalid("The URL is missing a hostname.");
  if (url.username || url.password) return invalid("Remove the username and password from the URL.");

  return { ok: true };
}

/** URL validation for non-image links (website, trailer). */
export function validateLinkUrl(value: string): UrlCheck {
  const raw = value.trim();
  if (!raw) return { ok: true };
  if (raw.length > MAX_IMAGE_URL_LENGTH) {
    return invalid(`Keep the URL under ${MAX_IMAGE_URL_LENGTH.toLocaleString("en-US")} characters.`);
  }
  if (hasUnsafeCharacters(raw)) return invalid("The URL cannot contain spaces or control characters.");
  if (raw.startsWith("/")) return { ok: true };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return invalid("Enter a valid URL starting with https:// (or http://).");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return invalid("Use an http:// or https:// URL.");
  }
  if (!url.hostname) return invalid("The URL is missing a hostname.");
  return { ok: true };
}

/** Only https (or site-relative) sources are ever handed to the browser. */
export function isRenderableImageUrl(value: string | undefined | null) {
  const raw = value?.trim();
  if (!raw) return false;
  if (raw.startsWith("/")) return true;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}
