import { NextResponse } from "next/server";
import { publishNews, unpublishNews } from "@/lib/news";
import { toNewsErrorResponse } from "@/lib/news-response";
import { authorizeNewsWriter } from "@/lib/news-auth";

/** 公開する */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await authorizeNewsWriter();
  if ("response" in authorized) return authorized.response;

  try {
    const { id } = await params;
    await publishNews(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to publish news article");
  }
}

/** 下書きに戻す */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await authorizeNewsWriter();
  if ("response" in authorized) return authorized.response;

  try {
    const { id } = await params;
    await unpublishNews(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to unpublish news article");
  }
}
