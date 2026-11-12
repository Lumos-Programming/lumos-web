import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";
import type { MemberDocument } from "@/lib/members";
import {
  EVENT_ERROR_CODES,
  EventError,
  type AttendanceCandidate,
  type EventAttendance,
} from "@/types/event";

const EVENTS = "events";
const ATTENDANCES = "attendances";

function attendancesOf(eventId: string) {
  return getDb().collection(EVENTS).doc(eventId).collection(ATTENDANCES);
}

/** Firestore のパスに使うので "/" を含む値や空文字は弾く */
const memberIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[^/]+$/);

const attendanceBodySchema = z.object({ memberId: memberIdSchema });

/** POST ボディから memberId を取り出す。不正なら EventError(INVALID_INPUT) */
export function parseAttendanceBody(body: unknown): string {
  const parsed = attendanceBodySchema.safeParse(body);
  if (!parsed.success) throw new EventError(EVENT_ERROR_CODES.INVALID_INPUT);
  return parsed.data.memberId;
}

/** パスパラメータの memberId を検証する */
export function parseMemberIdParam(value: string): string {
  const parsed = memberIdSchema.safeParse(value);
  if (!parsed.success) throw new EventError(EVENT_ERROR_CODES.INVALID_INPUT);
  return parsed.data;
}

/**
 * 出席を記録できるメンバーか (退会済み・サブアカウントは不可)。
 * アンケートに回答できるメンバーの判定にも使う。
 */
export function isAttendableMember(data: Partial<MemberDocument> | undefined) {
  return (
    Boolean(data) && data!.optedOut !== true && data!.isSubAccount !== true
  );
}

/**
 * 出席を記録する。すでに記録済みなら何もせず created: false を返す
 * (登録者・日時は最初のものを残す)。ポイント付与 (#375) は created が true の
 * ときだけ行えば二重付与にならない。
 */
export async function recordAttendance(
  eventId: string,
  memberId: string,
  recordedBy: string,
): Promise<{ created: boolean }> {
  const db = getDb();
  const eventRef = db.collection(EVENTS).doc(eventId);
  const memberRef = db.collection("members").doc(memberId);
  const attendanceRef = eventRef.collection(ATTENDANCES).doc(memberId);

  return db.runTransaction(async (tx) => {
    const [eventSnap, memberSnap, attendanceSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(memberRef),
      tx.get(attendanceRef),
    ]);
    if (!eventSnap.exists) throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);
    if (!isAttendableMember(memberSnap.data())) {
      throw new EventError(EVENT_ERROR_CODES.MEMBER_NOT_FOUND);
    }
    if (attendanceSnap.exists) return { created: false };

    tx.set(attendanceRef, {
      memberId,
      recordedBy,
      recordedAt: FieldValue.serverTimestamp(),
    });
    return { created: true };
  });
}

/** 出席記録を取り消す。記録がなければ removed: false */
export async function removeAttendance(
  eventId: string,
  memberId: string,
): Promise<{ removed: boolean }> {
  const db = getDb();
  const eventRef = db.collection(EVENTS).doc(eventId);
  const attendanceRef = eventRef.collection(ATTENDANCES).doc(memberId);

  return db.runTransaction(async (tx) => {
    const [eventSnap, attendanceSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(attendanceRef),
    ]);
    if (!eventSnap.exists) throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);
    if (!attendanceSnap.exists) return { removed: false };
    tx.delete(attendanceRef);
    return { removed: true };
  });
}

/** イベントの出席記録を登録順に返す */
export async function listAttendances(
  eventId: string,
): Promise<EventAttendance[]> {
  const snap = await attendancesOf(eventId).orderBy("recordedAt", "asc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      memberId: doc.id,
      recordedBy: data.recordedBy ?? "",
      recordedAt: data.recordedAt
        ? data.recordedAt.toDate().toISOString()
        : null,
    };
  });
}

/**
 * 出席登録画面で選べるメンバー。オンボーディング完了・在籍中・メインアカウントのみ。
 * 運営が当日に探しやすいよう、本名・ニックネーム・Discord 名をすべて返す。
 */
export async function listAttendanceCandidates(): Promise<
  AttendanceCandidate[]
> {
  const snap = await getDb()
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .get();

  return snap.docs
    .filter((doc) => isAttendableMember(doc.data() as MemberDocument))
    .map((doc) => {
      const d = doc.data() as Partial<MemberDocument>;
      return {
        id: doc.id,
        fullName: [d.lastName, d.firstName].filter(Boolean).join(" "),
        nickname: d.nickname ?? "",
        discordUsername: d.discordUsername ?? "",
        avatar: d.discordAvatar ?? "",
      };
    })
    .sort((a, b) =>
      (a.fullName || a.nickname || a.discordUsername).localeCompare(
        b.fullName || b.nickname || b.discordUsername,
        "ja",
      ),
    );
}
