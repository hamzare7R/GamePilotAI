import { requireAdmin } from "@/server/auth/admin";
import { getAdminUserAttachmentContent } from "@/server/admin/users";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only inert raster formats and PDF may render in the owner console. Anything
// else (SVG, HTML, office files, executables) is forced to download.
const PREVIEW_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const INLINE_MIME_TYPES = new Set([...PREVIEW_IMAGE_TYPES, "application/pdf"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id, attachmentId } = await params;
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(attachmentId)) {
    return jsonError("Invalid identifier.", 400, { code: "INVALID_ID" });
  }

  const attachment = await getAdminUserAttachmentContent(id, attachmentId);
  if (!attachment) {
    return jsonError("Attachment not found for this user.", 404, { code: "ATTACHMENT_NOT_FOUND" });
  }

  const mimeType = attachment.mimeType || "application/octet-stream";
  const inline = INLINE_MIME_TYPES.has(mimeType);
  const safeFilename = attachment.filename.replace(/[\r\n"]/g, "_");

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Length": String(attachment.content.length),
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="attachment"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Recorded-Size": String(attachment.recordedBytes),
    "X-Actual-Size": String(attachment.content.length),
  };
  // Raster images are rendered inside a fully sandboxed document. PDFs rely on
  // the browser's isolated viewer, which needs no document-level sandbox.
  if (PREVIEW_IMAGE_TYPES.has(mimeType)) {
    headers["Content-Security-Policy"] = "sandbox";
  }

  return new Response(new Uint8Array(attachment.content), { status: 200, headers });
}
