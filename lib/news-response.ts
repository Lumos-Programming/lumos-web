import { NextResponse } from "next/server";
import { NEWS_ERROR_RESPONSES, NewsError } from "@/types/news";

/**
 * お知らせ API が返す定型レスポンス。ルートごとに文言やステータスがぶれないようここに集める。
 * Response は一度しか送れないので、定数ではなく毎回作る関数にしている。
 */
export const NEWS_API_RESPONSES = {
  /** 未ログイン */
  unauthorized: () =>
    NextResponse.json({ error: "ログインが必要です" }, { status: 401 }),
  /** ログイン済みだが運営ではない (退会済みを含む) */
  forbidden: () =>
    NextResponse.json(
      { error: "お知らせを編集する権限がありません" },
      { status: 403 },
    ),
  /** 更新系の成功 */
  success: () => NextResponse.json({ success: true }),
  /** 画像アップロードでファイルが無い */
  imageRequired: () =>
    NextResponse.json({ error: "画像が選択されていません" }, { status: 400 }),
  /** 画像アップロードの想定外の失敗 */
  imageUploadFailed: () =>
    NextResponse.json(
      { error: "画像のアップロードに失敗しました" },
      { status: 500 },
    ),
} as const;

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
