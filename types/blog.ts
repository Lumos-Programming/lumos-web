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
 * 媒体の選択肢。「その他」を選んだときだけ自由記述させ、
 * 保存するのは自由記述した値そのもの (platform は string のまま)。
 */
export const BLOG_PLATFORM_PRESETS = ["Qiita", "Zenn", "Medium"] as const;
export type BlogPlatformPreset = (typeof BLOG_PLATFORM_PRESETS)[number];

/**
 * 媒体チップの背景色。各サービスのブランドカラーを使う。
 * プリセットに無い媒体(「その他」の自由記述)は既定の色のままにする。
 */
const PLATFORM_BADGE_CLASSES: Record<BlogPlatformPreset, string> = {
  Qiita: "bg-[#54C500]",
  Zenn: "bg-[#3C83F6]",
  Medium: "bg-[#1D1D1D]",
};

const DEFAULT_PLATFORM_BADGE_CLASS = "bg-gradient-orange";

export function getPlatformBadgeClass(platform: string): string {
  return (
    PLATFORM_BADGE_CLASSES[platform as BlogPlatformPreset] ??
    DEFAULT_PLATFORM_BADGE_CLASS
  );
}

export const BLOG_PLATFORM_OTHER = "その他";

/** 保存済みの platform が、フォーム上でどの選択肢にあたるかを返す */
export function toPlatformSelection(platform: string | undefined): {
  preset: string;
  other: string;
} {
  if (!platform) return { preset: "", other: "" };
  return BLOG_PLATFORM_PRESETS.includes(platform as BlogPlatformPreset)
    ? { preset: platform, other: "" }
    : { preset: BLOG_PLATFORM_OTHER, other: platform };
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
