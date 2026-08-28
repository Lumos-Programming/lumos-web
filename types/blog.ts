export interface Blog {
  id: string;
  authorId: string;
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string; // YYYY-MM-DD
  platform?: string;
  createdAt: number;
}

/**
 * ブログまわりのエラーコード。lib と API ルートの両方がこれを見るので、
 * 例外メッセージの文字列比較でハンドリングしない。
 */
export const BLOG_ERROR_CODES = {
  INVALID_URL: "INVALID_URL",
  TITLE_REQUIRED: "TITLE_REQUIRED",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
} as const;
export type BlogErrorCode =
  (typeof BLOG_ERROR_CODES)[keyof typeof BLOG_ERROR_CODES];

/** ユーザーに見せる文言と HTTP ステータス */
export const BLOG_ERROR_RESPONSES: Record<
  BlogErrorCode,
  { status: number; message: string }
> = {
  INVALID_URL: {
    status: 400,
    message: "記事URLは http:// または https:// で始まる必要があります",
  },
  TITLE_REQUIRED: { status: 400, message: "タイトルを入力してください" },
  NOT_FOUND: { status: 404, message: "記事が見つかりません" },
  FORBIDDEN: { status: 403, message: "他人の記事は操作できません" },
};

export class BlogError extends Error {
  readonly code: BlogErrorCode;

  constructor(code: BlogErrorCode) {
    super(BLOG_ERROR_RESPONSES[code].message);
    this.name = "BlogError";
    this.code = code;
  }
}
