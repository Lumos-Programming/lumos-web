import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  uploadToGCS,
  validateImageUpload,
  UploadValidationError,
} from "@/lib/upload";
import { authorizeNewsWriter } from "@/lib/news-auth";

/** お知らせのアイキャッチ画像。一覧のカードにも出るので大きめに許容する */
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const authorized = await authorizeNewsWriter();
  if ("response" in authorized) return authorized.response;

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "画像が選択されていません" },
        { status: 400 },
      );
    }

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
    return NextResponse.json(
      { error: "画像のアップロードに失敗しました" },
      { status: 500 },
    );
  }
}
