const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";

export class GmailRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly reason?: string;

  constructor(message: string, code: string, status: number, reason?: string) {
    super(message);
    this.name = "GmailRequestError";
    this.code = code;
    this.status = status;
    this.reason = reason;
  }
}

export class HistoryExpiredError extends Error {
  readonly code = "HISTORY_EXPIRED";

  constructor() {
    super("The stored history id is no longer available; a full resync is required.");
    this.name = "HistoryExpiredError";
  }
}

type FetchOptions = { accessToken: string; path: string; method?: "GET" | "POST"; body?: unknown };

async function gmailFetch({ accessToken, path, method = "GET", body }: FetchOptions) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${GMAIL_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      if (attempt === 2) throw new GmailRequestError("Gmail request failed.", "NETWORK_ERROR", 0);
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      continue;
    }

    if (response.ok) return response;
    if (response.status === 404) {
      throw new GmailRequestError("Gmail resource not found.", "NOT_FOUND", 404);
    }
    if (response.status === 401 || response.status === 403) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { status?: string; message?: string; errors?: Array<{ reason?: string }> } }
        | null;
      const reason = payload?.error?.errors?.[0]?.reason ?? payload?.error?.status ?? "UNKNOWN";
      throw new GmailRequestError(
        `Gmail authorization failed (${response.status}).`,
        "GMAIL_AUTHORIZATION_FAILED",
        response.status,
        reason,
      );
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      continue;
    }
    throw new GmailRequestError(`Gmail request failed (${response.status}).`, "GMAIL_ERROR", response.status);
  }

  throw new GmailRequestError("Gmail request failed.", "NETWORK_ERROR", 0);
}

export type WatchResult = { historyId: string; expiration: string };

export async function startInboxWatch(accessToken: string, topicName: string) {
  const response = await gmailFetch({
    accessToken,
    path: "/users/me/watch",
    method: "POST",
    body: { topicName, labelIds: ["INBOX"] },
  });
  const json = (await response.json().catch(() => null)) as
    | { historyId?: string; expiration?: string }
    | null;

  if (!json?.historyId || !json?.expiration) {
    throw new GmailRequestError("Gmail watch returned an unexpected payload.", "WATCH_INVALID", 502);
  }
  return { historyId: json.historyId, expiration: json.expiration } satisfies WatchResult;
}

type HistoryMessage = { message?: { id?: string; labelIds?: string[] } };

export async function listInboxHistory(accessToken: string, startHistoryId: string) {
  const ids = new Set<string>();
  let historyId: string | null = null;
  let pageToken: string | undefined;

  // Bound the loop so a very large backlog cannot exceed the function timeout.
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({
      startHistoryId,
      historyTypes: "messageAdded",
      labelIds: "INBOX",
      maxResults: "100",
    });
    if (pageToken) query.set("pageToken", pageToken);

    try {
      const response = await gmailFetch({
        accessToken,
        path: `/users/me/history?${query.toString()}`,
      });
      const json = (await response.json().catch(() => null)) as
        | {
            historyId?: string;
            nextPageToken?: string;
            history?: Array<{ messagesAdded?: HistoryMessage[] }>;
          }
        | null;

      historyId = json?.historyId ?? historyId;
      for (const entry of json?.history ?? []) {
        for (const added of entry.messagesAdded ?? []) {
          const id = added.message?.id;
          if (id) ids.add(id);
        }
      }

      if (!json?.nextPageToken) break;
      pageToken = json.nextPageToken;
    } catch (error) {
      if (error instanceof GmailRequestError && error.status === 404) throw new HistoryExpiredError();
      throw error;
    }
  }

  return { historyId, messageIds: [...ids] };
}

export async function listRecentInboxMessageIds(accessToken: string, maxResults = 1000) {
  const ids: string[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 10 && ids.length < maxResults; page += 1) {
    const query = new URLSearchParams({ labelIds: "INBOX", maxResults: String(Math.min(100, maxResults - ids.length)) });
    if (pageToken) query.set("pageToken", pageToken);
    const response = await gmailFetch({ accessToken, path: `/users/me/messages?${query.toString()}` });
    const json = (await response.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      nextPageToken?: string;
    } | null;
    ids.push(...(json?.messages ?? []).flatMap((entry) => (entry.id ? [entry.id] : [])));
    if (!json?.nextPageToken) break;
    pageToken = json.nextPageToken;
  }

  return ids.slice(0, maxResults);
}

export type MessageMetadata = {
  id: string;
  labelIds: string[];
  headers: Record<string, string>;
};

/**
 * `format=metadata` plus an explicit header allow-list: only From and Date are
 * requested. The subject (which often carries codes) is never fetched.
 */
export async function getMessageMetadata(accessToken: string, messageId: string) {
  const query = new URLSearchParams({ format: "metadata" });
  query.append("metadataHeaders", "From");
  query.append("metadataHeaders", "Date");

  const response = await gmailFetch({
    accessToken,
    path: `/users/me/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
  });

  const json = (await response.json().catch(() => null)) as
    | { id?: string; labelIds?: string[]; payload?: { headers?: Array<{ name?: string; value?: string }> } }
    | null;

  if (!json?.id) {
    throw new GmailRequestError("Gmail message payload was empty.", "MESSAGE_INVALID", 502);
  }

  const headers: Record<string, string> = {};
  for (const header of json.payload?.headers ?? []) {
    if (header.name && header.value) headers[header.name.toLowerCase()] = header.value;
  }

  return { id: json.id, labelIds: json.labelIds ?? [], headers } satisfies MessageMetadata;
}

export async function fetchMailboxHistoryId(accessToken: string) {
  const response = await gmailFetch({ accessToken, path: "/users/me/profile" });
  const json = (await response.json().catch(() => null)) as
    | { emailAddress?: string; historyId?: string }
    | null;
  if (!json?.emailAddress) {
    throw new GmailRequestError("Gmail profile returned no address.", "PROFILE_INVALID", 502);
  }
  return {
    emailAddress: json.emailAddress.trim().toLowerCase(),
    historyId: json.historyId ?? null,
  };
}


export type MessageContent = {
  id: string;
  headers: Record<string, string>;
  bodyText: string;
  snippet: string;
  attachments: Array<{ filename: string; mimeType: string; data: Buffer }>;
};

type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailMessagePart[];
};

function decodeMessageData(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function htmlToPlainText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|hr)\s*\/?\s*>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  ).replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function getMessageContent(accessToken: string, messageId: string): Promise<MessageContent> {
  const query = new URLSearchParams({ format: "full" });
  const response = await gmailFetch({
    accessToken,
    path: `/users/me/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
  });
  const json = (await response.json().catch(() => null)) as
    | {
        id?: string;
        snippet?: string;
        payload?: { headers?: Array<{ name?: string; value?: string }>; mimeType?: string; body?: { data?: string }; parts?: GmailMessagePart[] };
      }
    | null;

  if (!json?.id || !json.payload) {
    throw new GmailRequestError("Gmail message content was empty.", "MESSAGE_INVALID", 502);
  }

  const headers: Record<string, string> = {};
  for (const header of json.payload.headers ?? []) {
    if (header.name && header.value) headers[header.name.toLowerCase()] = header.value;
  }

  const textParts: string[] = [];
  const htmlParts: string[] = [];
  const attachmentParts: Array<{ filename: string; mimeType: string; attachmentId?: string; data?: string; size?: number }> = [];
  const visit = (part: GmailMessagePart) => {
    if (part.filename) {
      attachmentParts.push({
        filename: part.filename.slice(0, 180),
        mimeType: part.mimeType ?? "application/octet-stream",
        attachmentId: part.body?.attachmentId,
        data: part.body?.data,
        size: part.body?.size,
      });
    } else if (part.body?.data) {
      const decoded = decodeMessageData(part.body.data);
      if (part.mimeType === "text/plain") textParts.push(decoded);
      else if (part.mimeType === "text/html") htmlParts.push(decoded);
    }
    for (const child of part.parts ?? []) visit(child);
  };
  visit(json.payload);

  // Store real attachment bytes, with strict per-file and per-message bounds.
  const attachments: MessageContent["attachments"] = [];
  let totalAttachmentBytes = 0;
  for (const part of attachmentParts.slice(0, 10)) {
    if (part.size && part.size > 10 * 1024 * 1024) continue;
    let data: Buffer | null = null;
    if (part.data) {
      data = Buffer.from(part.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    } else if (part.attachmentId) {
      const attachmentResponse = await gmailFetch({
        accessToken,
        path: `/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(part.attachmentId)}`,
      });
      const attachmentJson = (await attachmentResponse.json().catch(() => null)) as { data?: string; size?: number } | null;
      if (attachmentJson?.data) {
        data = Buffer.from(attachmentJson.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      }
    }
    if (!data || data.length > 10 * 1024 * 1024 || totalAttachmentBytes + data.length > 20 * 1024 * 1024) continue;
    totalAttachmentBytes += data.length;
    attachments.push({ filename: part.filename, mimeType: part.mimeType, data });
  }

  const rawText = textParts.length ? textParts.join("\n\n") : htmlParts.map(htmlToPlainText).join("\n\n");
  return {
    id: json.id,
    headers,
    bodyText: rawText.slice(0, 100_000),
    snippet: (json.snippet ?? "").slice(0, 500),
    attachments,
  };
}

export type MessageHtmlContent = {
  id: string;
  html: string | null;
  text: string | null;
};

/**
 * Fetches the original HTML part on demand for owner diagnostics. The result is
 * never written back to the database; storage only keeps the plain-text body.
 */
export async function getMessageHtmlContent(
  accessToken: string,
  messageId: string,
): Promise<MessageHtmlContent> {
  const query = new URLSearchParams({ format: "full" });
  const response = await gmailFetch({
    accessToken,
    path: `/users/me/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
  });
  const json = (await response.json().catch(() => null)) as
    | {
        id?: string;
        payload?: { mimeType?: string; body?: { data?: string }; parts?: GmailMessagePart[] };
      }
    | null;

  if (!json?.id || !json.payload) {
    throw new GmailRequestError("Gmail message content was empty.", "MESSAGE_INVALID", 502);
  }

  const htmlParts: string[] = [];
  const textParts: string[] = [];
  const visit = (part: GmailMessagePart) => {
    if (!part.filename && part.body?.data) {
      const decoded = decodeMessageData(part.body.data);
      if (part.mimeType === "text/html") htmlParts.push(decoded);
      else if (part.mimeType === "text/plain") textParts.push(decoded);
    }
    for (const child of part.parts ?? []) visit(child);
  };
  visit(json.payload);

  const html = htmlParts.join("\n").trim();
  const text = textParts.join("\n").trim();
  return { id: json.id, html: html || null, text: text || null };
}
