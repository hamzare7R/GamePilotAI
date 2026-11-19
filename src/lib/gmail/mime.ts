/**
 * Gmail MIME body extraction.
 *
 * Gmail's `format=full` payload is a tree of MIME parts. Marketing and security
 * emails (Google, Outlook-generated templates) mix `multipart/alternative` with
 * `multipart/related`, Outlook-only conditional comments, VML blocks, hidden
 * preheader text and quoted-printable parts. This module resolves the tree to a
 * single readable body instead of concatenating every text part.
 *
 * Invariants:
 * - `bodyText` never combines a text/plain part with a text/html part.
 * - Each alternative group contributes at most one representation.
 * - Attachment parts (filename set) never contribute body text.
 * - The original HTML part is exposed separately and never merged into the text.
 */

export type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name?: string; value?: string }>;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

export type MimeAttachment = {
  filename: string;
  mimeType: string;
  attachmentId?: string;
  data?: string;
  size?: number;
};

export type ParsedMimeContent = {
  bodyText: string;
  source: "text/plain" | "text/html" | "empty";
  /** Best plain-text part as stored in the message (decoded, not converted). */
  text: string | null;
  /** Best original HTML part (decoded, not sanitized). */
  html: string | null;
  attachments: MimeAttachment[];
};

const MAX_BODY_CHARS = 100_000;

export function decodeBase64Url(data: string): Buffer {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function mimeOf(part: GmailPart) {
  return (part.mimeType ?? "").split(";")[0]!.trim().toLowerCase();
}

function headerValue(headers: GmailPart["headers"], name: string) {
  for (const header of headers ?? []) {
    if (header.name?.trim().toLowerCase() === name) return header.value ?? "";
  }
  return "";
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

/** Decodes `=XX` sequences and soft line breaks without touching plain text first. */
export function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; ) {
    const character = value[index]!;
    if (character === "=") {
      if (value[index + 1] === "\n") {
        index += 2;
        continue;
      }
      if (value[index + 1] === "\r" && value[index + 2] === "\n") {
        index += 3;
        continue;
      }
      const hex = value.slice(index + 1, index + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        index += 3;
        continue;
      }
    }
    const codePoint = value.codePointAt(index)!;
    const encoded = String.fromCodePoint(codePoint);
    for (const byte of Buffer.from(encoded, "utf8")) bytes.push(byte);
    index += encoded.length;
  }
  return Buffer.from(bytes).toString("utf8");
}

function decodeTextPart(part: GmailPart): string {
  const raw = decodeBase64Url(part.body?.data ?? "").toString("utf8");
  const transferEncoding = headerValue(part.headers, "content-transfer-encoding").toLowerCase();
  const looksQuotedPrintable =
    raw.includes("=\n") ||
    raw.includes("=\r\n") ||
    (transferEncoding.includes("quoted-printable") && /=[0-9a-fA-F]{2}/.test(raw));
  const decoded = looksQuotedPrintable ? decodeQuotedPrintable(raw) : raw;
  return normalizeNewlines(decoded).replace(/\u0000/g, "").replace(/^\uFEFF/, "");
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201D",
  ldquo: "\u201C",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  bull: "\u2022",
  middot: "\u00B7",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  zwnj: "\u200C",
  zwj: "\u200D",
  lrm: "\u200E",
  rlm: "\u200F",
  times: "\u00D7",
  divide: "\u00F7",
  deg: "\u00B0",
  euro: "\u20AC",
  pound: "\u00A3",
  yen: "\u00A5",
  laquo: "\u00AB",
  raquo: "\u00BB",
};

/** Single pass so `&amp;lt;` stays `&lt;` instead of being decoded twice. */
export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const codePoint =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (
        !Number.isFinite(codePoint) ||
        codePoint <= 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return match;
      }
      return String.fromCodePoint(codePoint);
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Outlook emits both an `[if mso]` branch (VML) and a normal branch containing
 * the same text. Gmail renders the normal branch, so Outlook-only blocks are
 * dropped and negated conditions (`!mso`, `!false`) keep their content.
 */
function isVisibleCondition(condition: string) {
  const normalized = condition.toLowerCase();
  if (/!\s*(?:mso|false)\b/.test(normalized)) return true;
  return !/\b(?:mso|false)\b/.test(normalized);
}

function stripOutlookArtifacts(html: string) {
  let value = html;

  value = value.replace(
    /<!--\[if([^\]]*)\]>(?:<!-->)?([\s\S]*?)(?:<!--)?<!\[endif\]-->/gi,
    (_match, condition: string, body: string) => (isVisibleCondition(condition) ? body : "\n"),
  );

  value = value.replace(/<!--[\s\S]*?-->/g, " ");
  value = value.replace(/<!\[(?:if|endif)[^\]]*\]>/gi, " ");

  value = value.replace(/<v:([a-z0-9]+)\b[^>]*>[\s\S]*?<\/v:\1>/gi, " ");
  value = value.replace(/<o:([a-z0-9]+)\b[^>]*>[\s\S]*?<\/o:\1>/gi, " ");
  value = value.replace(/<w:([a-z0-9]+)\b[^>]*>[\s\S]*?<\/w:\1>/gi, " ");
  value = value.replace(/<\/?(?:v|o|w):[a-z0-9]+\b[^>]*>/gi, " ");
  value = value.replace(/<xml\b[^>]*>[\s\S]*?<\/xml>/gi, " ");

  return value;
}

/**
 * Repeated paragraphs are the signature of duplicated alternative copies. After
 * whitespace cleanup paragraph boundaries are single newlines, so duplicates
 * must be collapsed line by line while blank-line blocks are preserved.
 */
function collapseDuplicateBlocks(value: string) {
  const keptBlocks: string[] = [];
  for (const rawBlock of value.split(/\n{2,}/)) {
    const keptLines: string[] = [];
    for (const line of rawBlock.split("\n").map((entry) => entry.trim())) {
      if (!line) continue;
      if (keptLines[keptLines.length - 1] === line) continue;
      keptLines.push(line);
    }
    const block = keptLines.join("\n");
    if (!block) continue;
    if (keptBlocks[keptBlocks.length - 1] === block) continue;
    keptBlocks.push(block);
  }
  return keptBlocks.join("\n\n");
}

function normalizeAutolinks(value: string) {
  return value.replace(/<((?:https?:\/\/|mailto:)[^<>\s]+)>/gi, "$1");
}

function cleanWhitespace(value: string) {
  return value
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function looksLikeHtml(value: string) {
  return /<!doctype\s+html|<html[\s>]|<body[\s>]|<head[\s>]|<style[\s>]|<meta[\s>]|<!--\s*\[if\b|<\/(?:style|script|table|div)>|<v:(?:rect|roundrect|shape|line)\b|<o:(?:p|office)/i.test(
    value,
  );
}

export function htmlToPlainText(html: string): string {
  let value = normalizeNewlines(html);

  value = value
    .replace(/<head[\s>][\s\S]*?<\/head>/gi, " ")
    .replace(/<(style|script|title|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\?xml[\s\S]*?\?>/gi, " ");

  value = stripOutlookArtifacts(value);

  // Hidden preheader text duplicates the first visible paragraph in Gmail.
  value = value.replace(
    /<(div|span|p|td|tr|table|center)\b([^>]*)>[\s\S]*?<\/\1>/gi,
    (match, _tag: string, attributes: string) =>
      /style\s*=\s*("[^"]*"|'[^']*')/i.test(attributes) &&
      /display\s*:\s*none|max-height\s*:\s*0|mso-hide\s*:\s*all/i.test(attributes)
        ? "\n"
        : match,
  );
  value = value.replace(/<(div|span|p)\b[^>]*\bhidden\b[^>]*>[\s\S]*?<\/\1>/gi, "\n");

  // Keep URL targets when the anchor has no visible text.
  value = value.replace(
    /<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>\s*<\/a>/gi,
    (_match, _quoted: string, doubleQuoted: string, singleQuoted: string, bare: string) =>
      (doubleQuoted ?? singleQuoted ?? bare ?? "").trim(),
  );

  value = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(?:p|div|tr|table|ul|ol|li|h[1-6]|blockquote|section|article|header|footer)>/gi, "\n")
    .replace(/<[^>]*>/g, " ");

  const text = decodeHtmlEntities(value);
  return collapseDuplicateBlocks(cleanWhitespace(normalizeAutolinks(text)));
}

function normalizePlainText(value: string) {
  const text = normalizeNewlines(value).replace(/^\uFEFF/, "").replace(/\u0000/g, "");
  return cleanWhitespace(normalizeAutolinks(text));
}

type ResolvedDoc = { kind: "plain" | "html"; text: string };

function longest(docs: ResolvedDoc[]): ResolvedDoc | null {
  let best: ResolvedDoc | null = null;
  for (const doc of docs) {
    if (!doc.text.trim()) continue;
    if (!best || doc.text.trim().length > best.text.trim().length) best = doc;
  }
  return best;
}

/**
 * `multipart/alternative` picks one representation (plain preferred);
 * container multiparts keep their first resolvable child so duplicated copies
 * are never concatenated.
 */
function resolveBody(part: GmailPart): ResolvedDoc | null {
  if (part.filename) return null;
  const type = mimeOf(part);

  if (!type.startsWith("multipart/")) {
    if (!part.body?.data) return null;
    const text = decodeTextPart(part);
    if (!text.trim()) return null;
    if (type === "text/plain") return { kind: "plain", text };
    if (type === "text/html") return { kind: "html", text };
    return null;
  }

  const children = (part.parts ?? [])
    .map(resolveBody)
    .filter((doc): doc is ResolvedDoc => doc !== null);
  if (children.length === 0) return null;

  if (type === "multipart/alternative") {
    return (
      longest(children.filter((doc) => doc.kind === "plain")) ??
      longest(children.filter((doc) => doc.kind === "html")) ??
      children[0]!
    );
  }

  return children[0]!;
}

function collectLeaves(part: GmailPart, docs: ResolvedDoc[]) {
  if (part.filename) return;
  const type = mimeOf(part);
  if (type.startsWith("multipart/")) {
    for (const child of part.parts ?? []) collectLeaves(child, docs);
    return;
  }
  if (!part.body?.data) return;
  if (type !== "text/plain" && type !== "text/html") return;
  const text = decodeTextPart(part);
  if (text.trim()) docs.push({ kind: type === "text/plain" ? "plain" : "html", text });
}

function collectAttachments(part: GmailPart, attachments: MimeAttachment[]) {
  if (part.filename) {
    attachments.push({
      filename: part.filename.slice(0, 180),
      mimeType: part.mimeType ?? "application/octet-stream",
      attachmentId: part.body?.attachmentId,
      data: part.body?.data,
      size: part.body?.size,
    });
  }
  for (const child of part.parts ?? []) collectAttachments(child, attachments);
}

function clampText(value: string) {
  if (value.length <= MAX_BODY_CHARS) return value;
  let end = MAX_BODY_CHARS;
  const code = value.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return value.slice(0, end);
}

export function parseMessageContent(payload: GmailPart): ParsedMimeContent {
  const attachments: MimeAttachment[] = [];
  collectAttachments(payload, attachments);

  const leaves: ResolvedDoc[] = [];
  collectLeaves(payload, leaves);
  const bestPlain = longest(leaves.filter((doc) => doc.kind === "plain"));
  const bestHtml = longest(leaves.filter((doc) => doc.kind === "html"));

  const body = resolveBody(payload);

  let bodyText = "";
  let source: ParsedMimeContent["source"] = "empty";

  if (body?.kind === "plain") {
    const normalized = normalizePlainText(body.text);
    if (looksLikeHtml(normalized)) {
      // Some senders put the HTML template in a text/plain part. Convert it
      // instead of leaking markup into the stored body.
      bodyText = htmlToPlainText(normalized);
      source = "text/html";
    } else {
      bodyText = normalized;
      source = "text/plain";
    }
  } else if (body?.kind === "html") {
    bodyText = htmlToPlainText(body.text);
    source = "text/html";
  }

  return {
    bodyText: clampText(bodyText),
    source,
    text: bestPlain?.text ?? null,
    html: bestHtml?.text ?? null,
    attachments,
  };
}
