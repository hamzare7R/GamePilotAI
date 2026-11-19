import { describe, expect, it } from "vitest";

import { parseMessageContent, type GmailPart } from "./mime";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function textPart(mimeType: string, content: string, headers?: GmailPart["headers"]): GmailPart {
  return {
    mimeType,
    headers,
    body: { data: encode(content), size: Buffer.byteLength(content) },
  };
}

function multi(mimeType: string, parts: GmailPart[]): GmailPart {
  return { mimeType, parts };
}

/** Shape used by Google account notifications: related > alternative + inline image. */
const GOOGLE_HTML = `<!doctype html>
<html><head><title>Google</title><style>.x{color:#000}</style></head>
<body>
<!--[if mso]>
<xml><o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings></xml>
<v:roundrect><v:textbox><div>Outlook only copy</div></v:textbox></v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<div style="display:none;max-height:0;overflow:hidden">Keep track of your Google Account data</div>
<div>Keep track of your Google Account data</div>
<!--<![endif]-->
<p>Review your recent activity at &lt;https://myaccount.google.com/activity&gt;.</p>
<!--[if false]><!--><div>Hidden false branch</div><!--<![endif]-->
</body></html>`;

const GOOGLE_PLAIN = `Keep track of your Google Account data

Review your recent activity at <https://myaccount.google.com/activity>.`;

function googleMessage(): GmailPart {
  return multi("multipart/related", [
    multi("multipart/alternative", [textPart("text/plain", GOOGLE_PLAIN), textPart("text/html", GOOGLE_HTML)]),
    {
      mimeType: "image/png",
      filename: "logo.png",
      body: { attachmentId: "att-1", size: 3, data: encode("img") },
    },
  ]);
}

describe("parseMessageContent", () => {
  it("prefers text/plain and never mixes HTML into the body", () => {
    const parsed = parseMessageContent(googleMessage());

    expect(parsed.source).toBe("text/plain");
    expect(parsed.bodyText).toContain("Keep track of your Google Account data");
    expect(parsed.bodyText).toContain("https://myaccount.google.com/activity");
    expect(parsed.bodyText).not.toContain("<!--");
    expect(parsed.bodyText).not.toContain("v:roundrect");
    expect(parsed.bodyText).not.toContain("Outlook only copy");
    expect(parsed.bodyText.match(/Keep track of your Google Account data/g)).toHaveLength(1);
    expect(parsed.html).toContain("<!--[if !mso]");
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0]?.filename).toBe("logo.png");
  });

  it("converts an HTML-only Outlook template without duplicated branches", () => {
    const parsed = parseMessageContent(textPart("text/html", GOOGLE_HTML));

    expect(parsed.source).toBe("text/html");
    expect(parsed.bodyText).toContain("Keep track of your Google Account data");
    expect(parsed.bodyText).toContain("https://myaccount.google.com/activity");
    expect(parsed.bodyText.match(/Keep track of your Google Account data/g)).toHaveLength(1);
    for (const leaked of [
      "<!--",
      "v:roundrect",
      "o:OfficeDocumentSettings",
      "Outlook only copy",
      "Hidden false branch",
      "display:none",
      "color:#000",
    ]) {
      expect(parsed.bodyText).not.toContain(leaked);
    }
  });

  it("converts a text/plain part that actually carries HTML", () => {
    const parsed = parseMessageContent(textPart("text/plain", GOOGLE_HTML));

    expect(parsed.source).toBe("text/html");
    expect(parsed.bodyText).not.toContain("<!--");
    expect(parsed.bodyText).not.toContain("v:textbox");
    expect(parsed.bodyText.match(/Keep track of your Google Account data/g)).toHaveLength(1);
  });

  it("walks nested mixed > related > alternative and keeps attachments separate", () => {
    const payload = multi("multipart/mixed", [
      googleMessage(),
      {
        mimeType: "application/pdf",
        filename: "report.pdf",
        body: { attachmentId: "att-2", size: 4, data: encode("pdf!") },
      },
    ]);

    const parsed = parseMessageContent(payload);

    expect(parsed.source).toBe("text/plain");
    expect(parsed.bodyText.startsWith("Keep track")).toBe(true);
    expect(parsed.attachments.map((attachment) => attachment.filename)).toEqual([
      "logo.png",
      "report.pdf",
    ]);
  });

  it("falls back to HTML when the plain alternative is empty", () => {
    const payload = multi("multipart/alternative", [
      textPart("text/plain", "   \n\n "),
      textPart("text/html", "<p>Only the HTML copy exists.</p>"),
    ]);

    const parsed = parseMessageContent(payload);

    expect(parsed.source).toBe("text/html");
    expect(parsed.bodyText).toBe("Only the HTML copy exists.");
  });

  it("does not concatenate identical HTML copies", () => {
    const payload = multi("multipart/mixed", [
      textPart("text/html", "<p>Stored once</p>"),
      textPart("text/html", "<p>Stored once</p>"),
    ]);

    const parsed = parseMessageContent(payload);

    expect(parsed.bodyText.match(/Stored once/g)).toHaveLength(1);
  });

  it("preserves Arabic UTF-8 plain text", () => {
    const arabic = "رمز التحقق الخاص بك هو ١٢٣٤٥٦";
    const parsed = parseMessageContent(textPart("text/plain", arabic));

    expect(parsed.bodyText).toBe(arabic);
    expect(parsed.source).toBe("text/plain");
  });

  it("decodes quoted-printable parts including soft line breaks", () => {
    const encoded =
      "=D8=B1=D9=85=D8=B2 =D8=A7=D9=84=D8=AA=D8=AD=D9=82=D9=82 =D9=A1=D9=A2=\r\n=D9=A3=D9=A4";
    const payload = textPart("text/plain", encoded, [
      { name: "Content-Transfer-Encoding", value: "quoted-printable" },
    ]);

    const parsed = parseMessageContent(payload);

    expect(parsed.bodyText).toBe("رمز التحقق ١٢٣٤");
  });

  it("preserves link targets for empty anchors and keeps visible link text", () => {
    const payload = textPart(
      "text/html",
      '<p><a href="https://example.com/reset"></a></p><p><a href="https://example.com/help">Get help</a></p>',
    );

    const parsed = parseMessageContent(payload);

    expect(parsed.bodyText).toContain("https://example.com/reset");
    expect(parsed.bodyText).toContain("Get help");
    expect(parsed.bodyText).not.toContain("<a");
  });

  it("keeps angle-bracketed URLs from genuine plain text without treating them as HTML", () => {
    const parsed = parseMessageContent(
      textPart("text/plain", "Visit <https://example.com/x> now"),
    );

    expect(parsed.source).toBe("text/plain");
    expect(parsed.bodyText).toBe("Visit https://example.com/x now");
  });

  it("returns an empty body when no text parts exist", () => {
    const parsed = parseMessageContent({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "image/jpeg",
          filename: "photo.jpg",
          body: { attachmentId: "att-3", size: 5, data: encode("jpeg") },
        },
      ],
    });

    expect(parsed.bodyText).toBe("");
    expect(parsed.source).toBe("empty");
    expect(parsed.html).toBeNull();
    expect(parsed.text).toBeNull();
    expect(parsed.attachments).toHaveLength(1);
  });

  it("decodes entities once and validates numeric references", () => {
    const parsed = parseMessageContent(
      textPart("text/html", "<p>AT&amp;T &amp;lt;tag&amp;gt; &#169; &#x1F600;</p>"),
    );

    expect(parsed.bodyText).toBe("AT&T &lt;tag&gt; © 😀");
  });

  it("collapses consecutive duplicated paragraphs from HTML", () => {
    const parsed = parseMessageContent(
      textPart("text/html", "<p>Same</p><p>Same</p><p>Next</p>"),
    );

    expect(parsed.bodyText).toBe("Same\nNext");
  });
});
