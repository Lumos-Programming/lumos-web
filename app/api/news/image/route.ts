import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  uploadToGCS,
  validateImageUpload,
  UploadValidationError,
} from "@/lib/upload";
import { auth } from "@/lib/auth";
import { isNewsEditor } from "@/lib/news-auth";
import { NEWS_API_RESPONSES } from "@/lib/news-response";

/** お知らせのアイキャッチ画像。一覧のカードにも出るので大きめに許容する */
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NEWS_API_RESPONSES.unauthorized();
  if (!isNewsEditor(session)) return NEWS_API_RESPONSES.forbidden();

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NEWS_API_RESPONSES.imageRequired();

    const buffer = await validateImageUpload(file, { maxBytes: MAX_BYTES });
    const url = await uploadToGCS(buffer, `news/${randomUUID()}.webp`, {
      contentType: file.type,
    });

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to upload news image:", error);
    return NEWS_API_RESPONSES.imageUploadFailed();
  }
}
