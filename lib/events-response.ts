import { NextResponse } from "next/server";
import { EVENT_ERROR_RESPONSES, EventError } from "@/types/event";

/**
 * イベント API が返す定型レスポンス。ルートごとに文言やステータスがぶれないようここに集める。
 * Response は一度しか送れないので、定数ではなく毎回作る関数にしている。
 */
export const EVENT_API_RESPONSES = {
  /** 未ログイン */
  unauthorized: () =>
    NextResponse.json({ error: "ログインが必要です" }, { status: 401 }),
  /** ログイン済みだが運営ではない (退会済みを含む) */
  forbidden: () =>
    NextResponse.json(
      { error: "イベントを編集する権限がありません" },
      { status: 403 },
    ),
  /** 更新系の成功 */
  success: () => NextResponse.json({ ok: true }),
  /** ?month= の形式不正 */
  invalidMonth: () =>
    NextResponse.json(
      { error: "month は YYYY-MM 形式で指定してください" },
      { status: 400 },
    ),
} as const;

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
