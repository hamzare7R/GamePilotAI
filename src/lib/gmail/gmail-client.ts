import { decodeBase64Url, parseMessageContent, type GmailPart } from "./mime";

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

type GmailPayload = {
  headers?: Array<{ name?: string; value?: string }>;
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

export async function getMessageContent(
  accessToken: string,
  messageId: string,
  options: { includeAttachments?: boolean } = {},
): Promise<MessageContent> {
  const query = new URLSearchParams({ format: "full" });
  const response = await gmailFetch({
    accessToken,
    path: `/users/me/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
  });
  const json = (await response.json().catch(() => null)) as
    | { id?: string; snippet?: string; payload?: GmailPayload }
    | null;

  if (!json?.id || !json.payload) {
    throw new GmailRequestError("Gmail message content was empty.", "MESSAGE_INVALID", 502);
  }

  const headers: Record<string, string> = {};
  for (const header of json.payload.headers ?? []) {
    if (header.name && header.value) headers[header.name.toLowerCase()] = header.value;
  }

  const parsed = parseMessageContent(json.payload);

  // Store real attachment bytes, with strict per-file and per-message bounds.
  // Reprocessing stored text passes includeAttachments=false so existing
  // attachment rows are neither re-downloaded nor rewritten.
  const attachments: MessageContent["attachments"] = [];
  let totalAttachmentBytes = 0;
  if (options.includeAttachments !== false) {
    for (const part of parsed.attachments.slice(0, 10)) {
      if (part.size && part.size > 10 * 1024 * 1024) continue;
      let data: Buffer | null = null;
      if (part.data) {
        data = decodeBase64Url(part.data);
      } else if (part.attachmentId) {
        const attachmentResponse = await gmailFetch({
          accessToken,
          path: `/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(part.attachmentId)}`,
        });
        const attachmentJson = (await attachmentResponse.json().catch(() => null)) as { data?: string; size?: number } | null;
        if (attachmentJson?.data) {
          data = decodeBase64Url(attachmentJson.data);
        }
      }
      if (!data || data.length > 10 * 1024 * 1024 || totalAttachmentBytes + data.length > 20 * 1024 * 1024) continue;
      totalAttachmentBytes += data.length;
      attachments.push({ filename: part.filename, mimeType: part.mimeType, data });
    }
  }

  return {
    id: json.id,
    headers,
    bodyText: parsed.bodyText,
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
    | { id?: string; payload?: GmailPayload }
    | null;

  if (!json?.id || !json.payload) {
    throw new GmailRequestError("Gmail message content was empty.", "MESSAGE_INVALID", 502);
  }

  // Resolution mirrors getMessageContent: one HTML alternative, never a
  // concatenation of every HTML copy in the tree.
  const parsed = parseMessageContent(json.payload);
  return {
    id: json.id,
    html: parsed.html?.trim() || null,
    text: parsed.text?.trim() || null,
  };
}
