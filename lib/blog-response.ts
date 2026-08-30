import { NextResponse } from "next/server";
import { BLOG_ERROR_RESPONSES, BlogError } from "@/types/blog";

/**
 * lib/blogs.ts が投げた BlogError を HTTP レスポンスに変換する。
 * 想定外の例外はログに残して 500 にする。
 */
export function toBlogErrorResponse(error: unknown, context: string) {
  if (error instanceof BlogError) {
    const { status, message } = BLOG_ERROR_RESPONSES[error.code];
    return NextResponse.json({ error: message }, { status });
  }
  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: "処理に失敗しました。時間をおいて試してください" },
    { status: 500 },
  );
}
