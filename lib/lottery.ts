import { randomInt } from "crypto";
import { getDb } from "@/lib/firebase";
import { pointDocument, pointKeys, pointRef } from "@/lib/points";
import {
  drawDeadline,
  drawIdFor,
  latestClosedDrawId,
} from "@/lib/lottery-schedule";
import {
  PRIZE_TIERS,
  type LotteryDraw,
  type LotteryTicket,
  type LotteryWinner,
} from "@/types/lottery";

const TICKETS = "lotteryTickets";
const DRAWS = "lotteryDraws";
const ALREADY_EXISTS = 6;

export interface TicketInput {
  /** 付与理由ごとに一意なキー (例: lottery_ticket:{repoId}:{issueNumber}) */
  key: string;
  memberId: string;
  description?: string;
  sourceUrl?: string;
}

/** チケットを 1 枚付与する。同じキーなら付与しない (Webhook の再送対策) */
export async function grantTicket(
  input: TicketInput,
  now: Date = new Date(),
): Promise<{ granted: boolean; drawId: string }> {
  if (!input.key || input.key.includes("/")) {
    throw new Error(`Invalid ticket key: ${input.key}`);
  }
  const drawId = drawIdFor(now);
  try {
    await getDb()
      .collection(TICKETS)
      .doc(input.key)
      .create({
        memberId: input.memberId,
        drawId,
        description: input.description ?? "",
        sourceUrl: input.sourceUrl ?? "",
        createdAt: now.toISOString(),
      });
    return { granted: true, drawId };
  } catch (e) {
    if ((e as { code?: number }).code === ALREADY_EXISTS) {
      return { granted: false, drawId };
    }
    throw e;
  }
}

export async function listTickets(drawId: string): Promise<LotteryTicket[]> {
  const snap = await getDb()
    .collection(TICKETS)
    .where("drawId", "==", drawId)
    .get();
  return snap.docs.map((d) => ({ key: d.id, ...d.data() }) as LotteryTicket);
}

/** 0 以上 1 未満の暗号学的乱数 */
export function secureRandom(): number {
  return randomInt(0, 2 ** 48 - 1) / 2 ** 48;
}

/**
 * 当選者を決める (純粋関数)。
 * チケットをランダムに並べ替え、先頭から順に未当選のメンバーを拾って上位の等級から埋める。
 * チケット 1 枚 = 1 口の重み付き非復元抽出と同じ分布になり、同じ人が複数当選することはない。
 */
export function pickWinners(
  tickets: Pick<LotteryTicket, "memberId">[],
  random: () => number = secureRandom,
): LotteryWinner[] {
  const order = tickets.map((t) => t.memberId);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const ticketCount = new Map<string, number>();
  for (const id of order) ticketCount.set(id, (ticketCount.get(id) ?? 0) + 1);

  const slots = PRIZE_TIERS.flatMap((t) =>
    Array.from({ length: t.count }, () => t),
  );
  const winners: LotteryWinner[] = [];
  const seen = new Set<string>();
  for (const memberId of order) {
    if (winners.length >= slots.length) break;
    if (seen.has(memberId)) continue;
    seen.add(memberId);
    const tier = slots[winners.length];
    winners.push({
      memberId,
      tier: tier.tier,
      tickets: ticketCount.get(memberId)!,
      delivered: tier.pointPrize,
    });
  }
  return winners;
}

function toDraw(id: string, data: FirebaseFirestore.DocumentData): LotteryDraw {
  return {
    drawId: id,
    drawnAt: data.drawnAt,
    totalTickets: data.totalTickets,
    participants: data.participants,
    winners: data.winners ?? [],
  };
}

export async function getDraw(drawId: string): Promise<LotteryDraw | null> {
  const snap = await getDb().collection(DRAWS).doc(drawId).get();
  return snap.exists ? toDraw(snap.id, snap.data()!) : null;
}

/**
 * 回を抽選する。抽選済みなら結果を変えずに既存の結果を返す (cron の再実行対策)。
 * 結果の保存と 3 等のポイント付与は 1 つのバッチで書くので、どちらかだけ残ることはない。
 */
export async function runDraw(
  drawId: string,
  now: Date = new Date(),
  random: () => number = secureRandom,
): Promise<{ draw: LotteryDraw; created: boolean }> {
  const existing = await getDraw(drawId);
  if (existing) return { draw: existing, created: false };

  const tickets = await listTickets(drawId);
  const winners = pickWinners(tickets, random);
  const draw: LotteryDraw = {
    drawId,
    drawnAt: now.toISOString(),
    totalTickets: tickets.length,
    participants: new Set(tickets.map((t) => t.memberId)).size,
    winners,
  };

  const db = getDb();
  const batch = db.batch();
  const { drawId: _id, ...fields } = draw;
  batch.create(db.collection(DRAWS).doc(drawId), fields);
  for (const w of winners) {
    const tier = PRIZE_TIERS.find((t) => t.tier === w.tier)!;
    if (!tier.pointPrize) continue;
    const key = pointKeys.lotteryPrize(drawId, w.memberId);
    batch.set(
      pointRef(key),
      pointDocument(
        {
          key,
          memberId: w.memberId,
          reason: "lottery_prize",
          description: `${drawId} の回`,
        },
        now,
      ),
    );
  }

  try {
    await batch.commit();
    return { draw, created: true };
  } catch (e) {
    // 同時に 2 回呼ばれた場合は先に書いた方を正とする
    if ((e as { code?: number }).code === ALREADY_EXISTS) {
      return { draw: (await getDraw(drawId))!, created: false };
    }
    throw e;
  }
}

export interface LotteryStatus {
  /** 受付中の回 */
  currentDrawId: string;
  deadline: string;
  myTickets: LotteryTicket[];
  totalTickets: number;
  /** 締切を過ぎた最新の回の結果 (未抽選なら null) */
  lastDraw: LotteryDraw | null;
}

/** メンバー向けの宝くじページのデータ */
export async function getLotteryStatus(
  memberId: string,
  now: Date = new Date(),
): Promise<LotteryStatus> {
  const currentDrawId = drawIdFor(now);
  const [tickets, lastDraw] = await Promise.all([
    listTickets(currentDrawId),
    getDraw(latestClosedDrawId(now)),
  ]);
  return {
    currentDrawId,
    deadline: drawDeadline(currentDrawId).toISOString(),
    myTickets: tickets
      .filter((t) => t.memberId === memberId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    totalTickets: tickets.length,
    lastDraw,
  };
}
