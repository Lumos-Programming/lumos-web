/**
 * GitHub の「草」(contribution calendar) 1 年分。
 *
 * GraphQL の週ごとの入れ子は Firestore に配列の配列として保存できないので、
 * startDate からの連続した日ごとの平坦な配列で持つ。表示側で 7 日ずつ列に切る。
 */
export interface GithubContributions {
  /** 取得時点の GitHub ログイン名。連携し直した人の古いデータを出さないための照合用 */
  login: string;
  /** 1 年間の合計 */
  total: number;
  /** 最初の日 ("YYYY-MM-DD")。GitHub は日曜始まりで返す */
  startDate: string;
  /** 日ごとのコントリビューション数。startDate から連続 */
  counts: number[];
  /** GitHub がプロフィールで使う濃さ (0 = なし 〜 4 = 最も濃い) */
  levels: number[];
  /** 取得日時 (ISO 8601) */
  fetchedAt: string;
}

/** GitHub GraphQL の contributionLevel を 0-4 に写す */
export const CONTRIBUTION_LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};
