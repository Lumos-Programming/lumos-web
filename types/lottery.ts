/**
 * 週次宝くじ (#377)。Issue を閉じた PR がマージされるとチケットがもらえ、
 * 毎週金曜 17:00 (日本時間) に締め切って 17:30 に抽選する。
 */

export interface PrizeTier {
  tier: 1 | 2 | 3;
  label: string;
  prize: string;
  count: number;
  /** ポイントで渡す景品なら付与するポイント理由 */
  pointPrize: boolean;
}

/** 景品 (週 2,000 円・暫定)。上から順に当選者を割り当てる */
export const PRIZE_TIERS: PrizeTier[] = [
  {
    tier: 1,
    label: "1等",
    prize: "500円程度のお菓子・ドリンク",
    count: 1,
    pointPrize: false,
  },
  {
    tier: 2,
    label: "2等",
    prize: "200円程度のお菓子",
    count: 3,
    pointPrize: false,
  },
  { tier: 3, label: "3等", prize: "ポイント +20", count: 5, pointPrize: true },
];

export interface LotteryWinner {
  memberId: string;
  tier: PrizeTier["tier"];
  /** その回に持っていたチケット枚数 */
  tickets: number;
  /** 景品を手渡したか (ポイント景品は抽選時に付与済みなので true) */
  delivered: boolean;
}

export interface LotteryDraw {
  /** 締切の金曜日 (日本時間) "YYYY-MM-DD" */
  drawId: string;
  drawnAt: string;
  totalTickets: number;
  participants: number;
  winners: LotteryWinner[];
}

/** 抽選前のチケット 1 枚 */
export interface LotteryTicket {
  key: string;
  memberId: string;
  drawId: string;
  description: string;
  sourceUrl: string;
  createdAt: string;
}
