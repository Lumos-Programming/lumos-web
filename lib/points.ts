import { getDb } from "@/lib/firebase";
import { todayJstMonthKey } from "@/lib/events-format";
import {
  POINT_RULES,
  type PointReason,
  type PointSummary,
  type PointTransaction,
} from "@/types/points";

const COLLECTION = "pointTransactions";

/** Firestore の ALREADY_EXISTS (gRPC code 6) */
const ALREADY_EXISTS = 6;

export interface AwardInput {
  key: string;
  memberId: string;
  reason: PointReason;
  description?: string;
  sourceUrl?: string;
}

/** ドキュメント ID に使えるキーか ("/" を含まない、空でない、長すぎない) */
export function isValidPointKey(key: string): boolean {
  return key.length > 0 && key.length <= 400 && !key.includes("/");
}

export function pointRef(key: string) {
  if (!isValidPointKey(key)) throw new Error(`Invalid point key: ${key}`);
  return getDb().collection(COLLECTION).doc(key);
}

/** 保存するフィールド。トランザクション/バッチの中から使えるよう分けている */
export function pointDocument(input: AwardInput, now: Date = new Date()) {
  return {
    memberId: input.memberId,
    points: POINT_RULES[input.reason],
    reason: input.reason,
    description: input.description ?? "",
    sourceUrl: input.sourceUrl ?? "",
    month: todayJstMonthKey(now),
    createdAt: now.toISOString(),
  };
}

/**
 * ポイントを付与する。同じキーで既に付与済みなら何もせず awarded: false。
 * Webhook の再送や同時リクエストでも二重付与にならない (create は既存 doc で失敗する)。
 */
export async function awardPoints(
  input: AwardInput,
  now: Date = new Date(),
): Promise<{ awarded: boolean }> {
  try {
    await pointRef(input.key).create(pointDocument(input, now));
    return { awarded: true };
  } catch (e) {
    if ((e as { code?: number }).code === ALREADY_EXISTS) {
      return { awarded: false };
    }
    throw e;
  }
}

/** 付与を取り消す (出席の取り消し、記事の削除など)。無ければ revoked: false */
export async function revokePoints(key: string): Promise<{ revoked: boolean }> {
  const ref = pointRef(key);
  const snap = await ref.get();
  if (!snap.exists) return { revoked: false };
  await ref.delete();
  return { revoked: true };
}

function toTransaction(
  id: string,
  data: FirebaseFirestore.DocumentData,
): PointTransaction {
  return {
    key: id,
    memberId: data.memberId,
    points: data.points,
    reason: data.reason,
    description: data.description ?? "",
    sourceUrl: data.sourceUrl ?? "",
    month: data.month,
    createdAt: data.createdAt,
  };
}

/**
 * メンバーの累計・今月の合計・履歴。
 * 複合インデックスを張らずに済むよう memberId の等価条件だけで取り、並べ替えはメモリ上で行う。
 */
export async function getPointSummary(
  memberId: string,
  now: Date = new Date(),
  historyLimit = 50,
): Promise<PointSummary> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("memberId", "==", memberId)
    .get();
  const all = snap.docs
    .map((d) => toTransaction(d.id, d.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const month = todayJstMonthKey(now);

  return {
    total: all.reduce((sum, t) => sum + t.points, 0),
    thisMonth: all
      .filter((t) => t.month === month)
      .reduce((sum, t) => sum + t.points, 0),
    history: all.slice(0, historyLimit),
  };
}

/** 付与キーの組み立て。キーの形式を 1 か所にまとめて、取り消し側と食い違わないようにする */
export const pointKeys = {
  githubPrMerged: (repoId: number, prNumber: number) =>
    `github_pr_merged:${repoId}:${prNumber}`,
  githubReviewApproved: (repoId: number, prNumber: number, userId: number) =>
    `github_review_approved:${repoId}:${prNumber}:${userId}`,
  blogPublished: (blogId: string) => `blog_published:${blogId}`,
  eventAttended: (eventId: string, memberId: string) =>
    `event_attended:${eventId}:${memberId}`,
};
