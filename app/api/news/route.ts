import { NextResponse } from "next/server";
import { createNews, parseNewsInput } from "@/lib/news";
import { toNewsErrorResponse } from "@/lib/news-response";
import { authorizeNewsWriter } from "@/lib/news-auth";

export async function POST(request: Request) {
  const authorized = await authorizeNewsWriter();
  if ("response" in authorized) return authorized.response;

  try {
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    const id = await createNews(parseNewsInput(body), authorized.authorId);
    return NextResponse.json({ id });
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to create news article");
  }
}
