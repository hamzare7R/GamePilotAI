import { afterEach, describe, expect, it, vi } from "vitest";

import { getMessageContent } from "./gmail-client";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const MESSAGE_PAYLOAD = {
  id: "m1",
  snippet: "Stored snippet",
  payload: {
    mimeType: "multipart/mixed",
    headers: [{ name: "From", value: "alerts@example.com" }],
    parts: [
      {
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { data: encode("Hello plain") } },
          { mimeType: "text/html", body: { data: encode("<p>Hello html</p>") } },
        ],
      },
      {
        mimeType: "application/pdf",
        filename: "report.pdf",
        body: { attachmentId: "att-1", size: 3 },
      },
    ],
  },
};

function stubFetch() {
  const calls: string[] = [];
  const mock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/attachments/")) return jsonResponse({ data: encode("pdf") });
    return jsonResponse(MESSAGE_PAYLOAD);
  });
  vi.stubGlobal("fetch", mock);
  return { calls, mock };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMessageContent attachment handling", () => {
  it("does not download attachments when includeAttachments is false", async () => {
    const { calls } = stubFetch();

    const content = await getMessageContent("access-token", "m1", { includeAttachments: false });

    expect(content.bodyText).toBe("Hello plain");
    expect(content.snippet).toBe("Stored snippet");
    expect(content.attachments).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/users/me/messages/m1");
    expect(calls.some((url) => url.includes("/attachments/"))).toBe(false);
  });

  it("still downloads attachments for the normal sync path", async () => {
    const { calls } = stubFetch();

    const content = await getMessageContent("access-token", "m1");

    expect(content.attachments).toHaveLength(1);
    expect(content.attachments[0]?.filename).toBe("report.pdf");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("/attachments/att-1");
  });
});
