/**
 * Rewarding システムのポイント。
 * 付与ルールの数値は暫定値 (#375)。変えるときはここだけ直す。
 */
export const POINT_RULES = {
  github_pr_merged: 10,
  github_review_approved: 3,
  blog_published: 5,
  event_attended: 5,
} as const;

export type PointReason = keyof typeof POINT_RULES;

export const POINT_REASON_LABELS: Record<PointReason, string> = {
  github_pr_merged: "PR がマージされた",
  github_review_approved: "PR を Approve した",
  blog_published: "ブログ記事を登録した",
  event_attended: "イベントに出席した",
};

/** ポイント履歴 1 件 (pointTransactions/{key}) */
export interface PointTransaction {
  /** 付与理由ごとに一意なキー (= ドキュメント ID)。同じキーでは二重に付与しない */
  key: string;
  memberId: string;
  points: number;
  reason: PointReason;
  /** 画面に出す補足 (PR タイトル、記事タイトル、イベント名など) */
  description: string;
  /** 根拠へのリンク (PR の URL など)。無ければ空文字 */
  sourceUrl: string;
  /** 日本時間の "YYYY-MM"。月間集計に使う */
  month: string;
  createdAt: string;
}

export interface PointSummary {
  total: number;
  thisMonth: number;
  /** 新しい順 */
  history: PointTransaction[];
}
