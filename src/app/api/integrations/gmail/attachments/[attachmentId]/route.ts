import { NextResponse } from "next/server";

import { getSessionUser } from "@/server/auth/user";
import { getAttachmentForUser } from "@/server/mail/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to download this attachment." }, { status: 401 });
  }

  const { attachmentId } = await params;
  const attachment = await getAttachmentForUser(user.id, attachmentId);
  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  const safeFilename = attachment.filename.replace(/[\r\n"]/g, "_");
  return new Response(new Uint8Array(attachment.content), {
    status: 200,
    headers: {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Length": String(attachment.content.length),
      "Content-Disposition": `attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
