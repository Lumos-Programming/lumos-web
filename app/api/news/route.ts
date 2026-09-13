import { NextResponse } from "next/server";
import { createNews, parseNewsInput } from "@/lib/news";
import { NEWS_API_RESPONSES, toNewsErrorResponse } from "@/lib/news-response";
import { auth } from "@/lib/auth";
import { isNewsEditor } from "@/lib/news-auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NEWS_API_RESPONSES.unauthorized();
  if (!isNewsEditor(session)) return NEWS_API_RESPONSES.forbidden();

  try {
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    const id = await createNews(parseNewsInput(body), session.user.id);
    return NextResponse.json({ id });
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to create news article");
  }
}
