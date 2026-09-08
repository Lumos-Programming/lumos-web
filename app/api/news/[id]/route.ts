import { NextResponse } from "next/server";
import { deleteNews, parseNewsInput, updateNews } from "@/lib/news";
import { toNewsErrorResponse } from "@/lib/news-response";
import { authorizeNewsWriter } from "@/lib/news-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await authorizeNewsWriter();
  if ("response" in authorized) return authorized.response;

  try {
    const { id } = await params;
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    await updateNews(id, parseNewsInput(body));
    return NextResponse.json({ success: true });
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to update news article");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorized = await authorizeNewsWriter();
  if ("response" in authorized) return authorized.response;

  try {
    const { id } = await params;
    await deleteNews(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to delete news article");
  }
}
