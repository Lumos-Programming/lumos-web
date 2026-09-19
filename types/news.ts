export const NEWS_CATEGORIES = ["プロジェクト", "イベント"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_STATUSES = ["draft", "published"] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

/**
 * お知らせ 1 件。Firestore の Timestamp は ISO 文字列に変換済みなので
 * そのまま Client Component に渡せる。
 *
 * 本文 (body) は Markdown で保持する。表示は react-markdown に任せていて、
 * react-markdown は既定で生 HTML を描画しない (rehype-raw を入れていない) ため、
 * HTML を保存して dangerouslySetInnerHTML で出す従来の作りと違い XSS にならない。
 */
export interface NewsArticle {
  id: string;
  /** 表示用の日付。"2025年4月中" や "2025年5月21-23日" のような自由形式を許容する */
  date: string;
  title: string;
  summary: string;
  /** 本文 (Markdown) */
  body: string;
  image: string;
  category: NewsCategory;
  status: NewsStatus;
  /** 並べ替えに使う ISO 8601 日時。一度も公開していなければ null */
  publishedAt: string | null;
  /** 執筆者の Discord ID */
  authorId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return NEWS_CATEGORIES.includes(value as NewsCategory);
}

/**
 * 新しい順。一度も公開していない下書き (publishedAt が null) は末尾に寄せる。
 * サーバーの一覧と管理 UI の楽観更新で同じ並びを使う。
 */
export function byPublishedAtDesc(a: NewsArticle, b: NewsArticle): number {
  if (a.publishedAt === b.publishedAt) return 0;
  if (a.publishedAt === null) return 1;
  if (b.publishedAt === null) return -1;
  return b.publishedAt.localeCompare(a.publishedAt);
}

/**
 * お知らせまわりのエラーコード。lib と API ルートの両方がこれを見るので、
 * 例外メッセージの文字列比較でハンドリングしない。
 */
export const NEWS_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  TITLE_REQUIRED: "TITLE_REQUIRED",
  BODY_REQUIRED: "BODY_REQUIRED",
  DATE_REQUIRED: "DATE_REQUIRED",
  INVALID_CATEGORY: "INVALID_CATEGORY",
  INVALID_IMAGE_URL: "INVALID_IMAGE_URL",
  NOT_FOUND: "NOT_FOUND",
} as const;
export type NewsErrorCode =
  (typeof NEWS_ERROR_CODES)[keyof typeof NEWS_ERROR_CODES];

/** ユーザーに見せる文言と HTTP ステータス */
export const NEWS_ERROR_RESPONSES: Record<
  NewsErrorCode,
  { status: number; message: string }
> = {
  INVALID_INPUT: { status: 400, message: "入力の形式が正しくありません" },
  TITLE_REQUIRED: { status: 400, message: "タイトルを入力してください" },
  BODY_REQUIRED: { status: 400, message: "本文を入力してください" },
  DATE_REQUIRED: { status: 400, message: "日付を入力してください" },
  INVALID_CATEGORY: { status: 400, message: "カテゴリの指定が不正です" },
  INVALID_IMAGE_URL: {
    status: 400,
    message:
      "画像URLは / または http:// または https:// で始まる必要があります",
  },
  NOT_FOUND: { status: 404, message: "お知らせが見つかりません" },
};

export class NewsError extends Error {
  readonly code: NewsErrorCode;

  constructor(code: NewsErrorCode) {
    super(NEWS_ERROR_RESPONSES[code].message);
    this.name = "NewsError";
    this.code = code;
  }
}
