import { NextResponse } from "next/server";
import { EVENT_ERROR_RESPONSES, EventError } from "@/types/event";

/**
 * lib/events.ts が投げた EventError を HTTP レスポンスに変換する。
 * 想定外の例外はログに残して 500 にする。
 */
export function toEventErrorResponse(error: unknown, context: string) {
  if (error instanceof EventError) {
    const { status, message } = EVENT_ERROR_RESPONSES[error.code];
    return NextResponse.json({ error: message }, { status });
  }
  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: "処理に失敗しました。時間をおいて試してください" },
    { status: 500 },
  );
}
