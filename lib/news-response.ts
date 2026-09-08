import { NextResponse } from "next/server";
import { NEWS_ERROR_RESPONSES, NewsError } from "@/types/news";

/**
 * lib/news.ts が投げた NewsError を HTTP レスポンスに変換する。
 * 想定外の例外はログに残して 500 にする。
 */
export function toNewsErrorResponse(error: unknown, context: string) {
  if (error instanceof NewsError) {
    const { status, message } = NEWS_ERROR_RESPONSES[error.code];
    return NextResponse.json({ error: message }, { status });
  }
  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: "処理に失敗しました。時間をおいて試してください" },
    { status: 500 },
  );
}
