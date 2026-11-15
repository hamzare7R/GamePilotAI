import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { requireGmailConfig } from "./env";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

/**
 * Refresh tokens are encrypted with AES-256-GCM using a key that only exists in
 * server environment variables. The stored format is `v1:iv:tag:ciphertext`,
 * each part base64url encoded.
 */
export function encryptToken(plain: string) {
  const { encryptionKey } = requireGmailConfig();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(
    ":",
  );
}

export function decryptToken(payload: string) {
  const { encryptionKey } = requireGmailConfig();
  const [version, ivPart, tagPart, dataPart] = payload.split(":");
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("Stored Gmail credentials have an unsupported format.");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
  return plain.toString("utf8");
}
