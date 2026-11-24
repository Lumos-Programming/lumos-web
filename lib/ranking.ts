import { getDb } from "@/lib/firebase";
import { shiftMonth, todayJstMonthKey } from "@/lib/events-format";
import type { MemberDocument } from "@/lib/members";
import {
  RANKING_TOP_N,
  type MonthlyRanking,
  type RankingEntry,
} from "@/types/ranking";

const POINTS = "pointTransactions";
const RANKINGS = "monthlyRankings";
/** Firestore の ALREADY_EXISTS (gRPC code 6) */
const ALREADY_EXISTS = 6;

/**
 * メンバーごとの合計から順位を付ける (純粋関数)。
 * 合計が 0 以下のメンバーは順位を付けない。同点は同順位にして、次の順位は人数分飛ばす
 * (標準競技順位: 30, 20, 20, 10 → 1, 2, 2, 4)。同点内の並びは memberId 順で固定する。
 */
export function rankTotals(
  totals: ReadonlyMap<string, number>,
): RankingEntry[] {
  const sorted = [...totals]
    .filter(([, points]) => points > 0)
    .sort(([a, pa], [b, pb]) => pb - pa || a.localeCompare(b));

  const entries: RankingEntry[] = [];
  sorted.forEach(([memberId, points], i) => {
    const prev = entries[i - 1];
    const rank = prev && prev.points === points ? prev.rank : i + 1;
    entries.push({ memberId, points, rank });
  });
  return entries;
}

/** 表彰対象 = 上位 n 位まで。境界で同点のメンバーは全員含める (30, 20, 20, 20, 10 → 4 人) */
export function selectHonorees(
  entries: RankingEntry[],
  n: number = RANKING_TOP_N,
): RankingEntry[] {
  return entries.filter((e) => e.rank <= n);
}

/** ポイント履歴をメンバーごとに合計する (純粋関数) */
export function sumByMember(
  transactions: { memberId: string; points: number }[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    totals.set(t.memberId, (totals.get(t.memberId) ?? 0) + t.points);
  }
  return totals;
}

/** 順位に載せないメンバーか (退会済み・サブアカウント・members に doc が無い) */
export function isExcludedFromRanking(
  member: Pick<MemberDocument, "optedOut" | "isSubAccount"> | undefined,
): boolean {
  return !member || member.optedOut === true || member.isSubAccount === true;
}

/**
 * 月キーの順位を Firestore から計算する。
 * 複合インデックスを張らずに済むよう month の等価条件だけで取り、合計はメモリ上で行う。
 */
export async function computeMonthlyRanking(
  month: string,
): Promise<RankingEntry[]> {
  const db = getDb();
  const snap = await db.collection(POINTS).where("month", "==", month).get();
  const totals = sumByMember(
    snap.docs.map((d) => ({
      memberId: d.get("memberId") as string,
      points: Number(d.get("points")) || 0,
    })),
  );
  if (totals.size === 0) return [];

  const memberSnaps = await db.getAll(
    ...[...totals.keys()].map((id) => db.collection("members").doc(id)),
  );
  for (const m of memberSnaps) {
    const data = m.exists ? (m.data() as MemberDocument) : undefined;
    if (isExcludedFromRanking(data)) totals.delete(m.id);
  }
  return rankTotals(totals);
}

function toRanking(
  id: string,
  data: FirebaseFirestore.DocumentData,
): MonthlyRanking {
  return {
    month: id,
    finalizedAt: data.finalizedAt,
    entries: data.entries ?? [],
    honorees: data.honorees ?? [],
  };
}

export async function getMonthlyRanking(
  month: string,
): Promise<MonthlyRanking | null> {
  const snap = await getDb().collection(RANKINGS).doc(month).get();
  return snap.exists ? toRanking(snap.id, snap.data()!) : null;
}

/**
 * 月のランキングを確定する。確定済みなら結果を変えずに保存済みの結果を返す (cron の再実行対策)。
 * 保存は create なので、同時に呼ばれても doc は 1 つだけになり、created: true も 1 回だけ返る。
 */
export async function finalizeMonthlyRanking(
  month: string,
  now: Date = new Date(),
): Promise<{ ranking: MonthlyRanking; created: boolean }> {
  const existing = await getMonthlyRanking(month);
  if (existing) return { ranking: existing, created: false };

  const entries = await computeMonthlyRanking(month);
  const ranking: MonthlyRanking = {
    month,
    finalizedAt: now.toISOString(),
    entries,
    honorees: selectHonorees(entries),
  };
  const { month: _id, ...fields } = ranking;
  try {
    await getDb().collection(RANKINGS).doc(month).create(fields);
    return { ranking, created: true };
  } catch (e) {
    // 同時に 2 回呼ばれた場合は先に書いた方を正とする
    if ((e as { code?: number }).code === ALREADY_EXISTS) {
      return { ranking: (await getMonthlyRanking(month))!, created: false };
    }
    throw e;
  }
}

/** 日本時間で now の前月の月キー (1 月なら前年 12 月) */
export function previousJstMonthKey(now: Date = new Date()): string {
  return shiftMonth(todayJstMonthKey(now), -1);
}

export interface RankingPageData {
  month: string;
  /** 今月の暫定順位 */
  current: RankingEntry[];
  lastMonth: string;
  /** 前月の確定結果 (未確定なら null) */
  lastRanking: MonthlyRanking | null;
}

/** メンバー向けのランキングページのデータ */
export async function getRankingPageData(
  now: Date = new Date(),
): Promise<RankingPageData> {
  const month = todayJstMonthKey(now);
  const lastMonth = shiftMonth(month, -1);
  const [current, lastRanking] = await Promise.all([
    computeMonthlyRanking(month),
    getMonthlyRanking(lastMonth),
  ]);
  return { month, current, lastMonth, lastRanking };
}
