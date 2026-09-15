/**
 * Lusy Reminder Bot の状態保存。
 *
 * 完了イベント (Issue close / PR merge) の一次ソースは Webhook。
 * 定期実行時の snapshot 差分だけだと「前回実行から今回実行の間に作られて閉じられた」
 * Item は前回 state が存在せず検出できないため (issue #273 §7)。
 *
 * TTL: lusyCompletionEvents / lusyNotificationLog は `expiresAt` を持つ。
 * Firestore の TTL ポリシーを同フィールドに設定すること (infra/firestore.tf)。
 */

import { getDb } from "@/lib/firebase";
import { Timestamp } from "firebase-admin/firestore";
import type { GitHubUserRef, LusyItemType } from "./types";

const RUN_DOC_PATH = "system/lusyReminder";
const COMPLETIONS = "lusyCompletionEvents";
const SNAPSHOTS = "lusyItemSnapshots";
const NOTIFICATION_LOG = "lusyNotificationLog";

const COMPLETION_TTL_DAYS = 30;
const LOG_TTL_DAYS = 90;

function daysFromNow(days: number): Timestamp {
  return Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
}

// --- 実行状態 ---

export interface RunState {
  /** 前回の正常実行時刻 (Unix 秒)。未実行なら undefined。 */
  lastSuccessfulRunAt?: number;
  /** カテゴリごとの直前に使ったテンプレート index (連続で同じ文面を避けるため)。 */
  lastTemplateIndex?: Record<string, number>;
}

export async function getRunState(): Promise<RunState> {
  const snap = await getDb().doc(RUN_DOC_PATH).get();
  return snap.exists ? ((snap.data() ?? {}) as RunState) : {};
}

export async function setLastSuccessfulRunAt(atSec: number): Promise<void> {
  await getDb()
    .doc(RUN_DOC_PATH)
    .set({ lastSuccessfulRunAt: atSec }, { merge: true });
}

export async function setLastTemplateIndex(
  index: Record<string, number>,
): Promise<void> {
  await getDb()
    .doc(RUN_DOC_PATH)
    .set({ lastTemplateIndex: index }, { merge: true });
}

/**
 * 通知間隔のクールダウン判定。
 * Cloud Scheduler は毎日叩き、実際に送るかどうかはここで決める。
 * こうしておくと 1 回失敗しても翌日リトライされる (3 日周期で組むと次が 3 日後になる)。
 */
export function isCooldownActive(
  state: RunState,
  intervalDays: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): { active: boolean; retryAfterSeconds: number } {
  const last = state.lastSuccessfulRunAt;
  if (last === undefined) return { active: false, retryAfterSeconds: 0 };

  const intervalSec = intervalDays * 24 * 60 * 60;
  const elapsed = nowSec - last;
  return elapsed >= intervalSec
    ? { active: false, retryAfterSeconds: 0 }
    : { active: true, retryAfterSeconds: intervalSec - elapsed };
}

// --- 完了イベント ---

export interface CompletionEvent {
  nodeId: string;
  itemType: LusyItemType;
  repository: string;
  number: number;
  title: string;
  url: string;
  /** 祝う相手。Issue は assignee、PR は author。 */
  celebrants: GitHubUserRef[];
  completedAt: string;
  notified: boolean;
}

/**
 * Webhook から完了イベントを記録する。
 * doc id を nodeId にしているので、GitHub の再配信で重複しても 1 件に潰れる。
 */
export async function recordCompletionEvent(
  event: Omit<CompletionEvent, "notified">,
): Promise<void> {
  await getDb()
    .collection(COMPLETIONS)
    .doc(event.nodeId)
    .set(
      {
        ...event,
        notified: false,
        expiresAt: daysFromNow(COMPLETION_TTL_DAYS),
      },
      { merge: true },
    );
}

/** まだ祝っていない完了イベントを取り出す。 */
export async function listPendingCompletions(
  limit = 100,
): Promise<CompletionEvent[]> {
  const snap = await getDb()
    .collection(COMPLETIONS)
    .where("notified", "==", false)
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as CompletionEvent);
}

/**
 * 完了イベントを通知済みにする。
 * これを忘れると次回実行で同じ Merge 済み PR をもう一度祝ってしまう。
 */
export async function markCompletionsNotified(
  nodeIds: string[],
): Promise<void> {
  if (nodeIds.length === 0) return;
  const db = getDb();
  const batch = db.batch();
  for (const nodeId of nodeIds) {
    batch.set(
      db.collection(COMPLETIONS).doc(nodeId),
      { notified: true, notifiedAt: Timestamp.now() },
      { merge: true },
    );
  }
  await batch.commit();
}

/**
 * 未通知の完了イベントを取り消す。
 * Issue が閉じられた直後に reopen された場合、まだ祝っていないなら祝ってはいけない。
 * すでに通知済み (notified=true) のものは履歴として残す。
 */
export async function discardPendingCompletion(nodeId: string): Promise<void> {
  const ref = getDb().collection(COMPLETIONS).doc(nodeId);
  const snap = await ref.get();
  if (!snap.exists) return;
  if ((snap.data() as CompletionEvent).notified) return;
  await ref.delete();
}

// --- Item snapshot ---

export interface ItemSnapshot {
  nodeId: string;
  repository: string;
  itemType: LusyItemType;
  number: number;
  previousState: string;
  previousDraftState?: boolean;
  previousReviewState?: string | null;
  previousProjectStatus?: string | null;
  updatedAt: string;
}

/** 状態遷移 (Draft → Ready など) を追えるよう snapshot を保存する。 */
export async function saveItemSnapshots(
  snapshots: ItemSnapshot[],
): Promise<void> {
  if (snapshots.length === 0) return;
  const db = getDb();

  // Firestore の batch 上限は 500 件
  for (let i = 0; i < snapshots.length; i += 400) {
    const batch = db.batch();
    for (const s of snapshots.slice(i, i + 400)) {
      batch.set(db.collection(SNAPSHOTS).doc(s.nodeId), s, { merge: true });
    }
    await batch.commit();
  }
}

export async function getItemSnapshots(): Promise<Map<string, ItemSnapshot>> {
  const snap = await getDb().collection(SNAPSHOTS).get();
  return new Map(snap.docs.map((d) => [d.id, d.data() as ItemSnapshot]));
}

// --- 通知ログ ---

export interface NotificationLogEntry {
  itemId: string;
  notificationType: string;
  discordUserId: string | null;
}

/** 何を誰に送ったかを残す。障害調査と重複検知のため。 */
export async function recordNotifications(
  entries: NotificationLogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const db = getDb();
  const notifiedAt = Timestamp.now();
  const expiresAt = daysFromNow(LOG_TTL_DAYS);

  for (let i = 0; i < entries.length; i += 400) {
    const batch = db.batch();
    for (const entry of entries.slice(i, i + 400)) {
      batch.set(db.collection(NOTIFICATION_LOG).doc(), {
        ...entry,
        notifiedAt,
        expiresAt,
      });
    }
    await batch.commit();
  }
}
