/**
 * 月間ランキングと上位者表彰 (#376)。
 * 日本時間の月ごとのポイント合計で順位を付け、月初に前月の上位者を確定する。
 */

/** 表彰する順位の範囲 (上位 N 位まで)。境界で同点のメンバーは全員表彰する */
export const RANKING_TOP_N = 3;

/** 表彰の景品。予算は週次宝くじの積立分 (月約 3,600 円) */
export const RANKING_PRIZE_NOTE = "アメニティは運営から後日お渡しします";

export interface RankingEntry {
  memberId: string;
  /** その月のポイント合計 (1 以上) */
  points: number;
  /** 同点は同順位、次の順位は人数分飛ばす (1, 1, 3) */
  rank: number;
}

/** 確定した月間ランキング (monthlyRankings/{YYYY-MM}) */
export interface MonthlyRanking {
  /** 日本時間の "YYYY-MM" (= ドキュメント ID) */
  month: string;
  finalizedAt: string;
  /** 順位順の全エントリ */
  entries: RankingEntry[];
  /** 表彰対象 (rank <= RANKING_TOP_N) */
  honorees: RankingEntry[];
}
