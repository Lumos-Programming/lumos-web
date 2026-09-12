import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";
import {
  addDays,
  dateKeyToIso,
  monthStartIso,
  shiftMonth,
  filterEventsInMonth,
  todayJstKey,
} from "@/lib/events-format";
import {
  EVENT_ERROR_CODES,
  EventError,
  byStartAtAsc,
  type CircleEvent,
} from "@/types/event";

const COLLECTION = "events";

/** イベントの中身。出どころと作成者は更新で触らないので含めない */
export type EventInput = Pick<
  CircleEvent,
  "title" | "description" | "startAt" | "endAt" | "allDay" | "location"
>;

/**
 * リクエストボディの形。日時の妥当性は assertValidEventInput が見るので、
 * ここでは型だけを保証する。endAt は省略も null も「終了なし」として扱う。
 */
const eventInputSchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  allDay: z.boolean().default(false),
  location: z.string().default(""),
});

function parseIso(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function assertValidEventInput(input: EventInput): void {
  if (input.title.trim() === "") {
    throw new EventError(EVENT_ERROR_CODES.TITLE_REQUIRED);
  }
  const start = parseIso(input.startAt);
  if (!start) throw new EventError(EVENT_ERROR_CODES.INVALID_START_AT);

  if (input.endAt !== null) {
    const end = parseIso(input.endAt);
    if (!end) throw new EventError(EVENT_ERROR_CODES.INVALID_END_AT);
    // 終日は最終日を含む扱いなので同日 (同時刻) を許す。時刻付きは開始より後でないと意味がない
    const tooEarly = input.allDay ? end < start : end <= start;
    if (tooEarly) throw new EventError(EVENT_ERROR_CODES.END_BEFORE_START);
  }
}

/** 未検証のリクエストボディを EventInput にする。不正なら EventError を投げる */
export function parseEventInput(body: unknown): EventInput {
  const parsed = eventInputSchema.safeParse(body);
  if (!parsed.success) throw new EventError(EVENT_ERROR_CODES.INVALID_INPUT);

  const input: EventInput = {
    title: parsed.data.title,
    description: parsed.data.description,
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt ?? null,
    allDay: parsed.data.allDay,
    location: parsed.data.location,
  };
  assertValidEventInput(input);
  // 保存前に ISO を正規化しておく (入力は "+09:00" 付きでも来る)
  return {
    ...input,
    startAt: new Date(input.startAt).toISOString(),
    endAt: input.endAt ? new Date(input.endAt).toISOString() : null,
  };
}

function toIso(value?: FirebaseFirestore.Timestamp | null): string | null {
  return value ? value.toDate().toISOString() : null;
}

function toCircleEvent(
  id: string,
  data: FirebaseFirestore.DocumentData,
): CircleEvent {
  return {
    id,
    title: data.title,
    description: data.description ?? "",
    startAt: data.startAt.toDate().toISOString(),
    endAt: toIso(data.endAt),
    allDay: data.allDay === true,
    location: data.location ?? "",
    source: data.source ?? "manual",
    sourceRef: data.sourceRef ?? null,
    createdBy: data.createdBy ?? "",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** 保存用の形。日時は Timestamp、endAt が無ければ null を明示的に入れる */
function toDocumentFields(input: EventInput) {
  return {
    title: input.title.trim(),
    description: input.description,
    startAt: Timestamp.fromDate(new Date(input.startAt)),
    endAt: input.endAt ? Timestamp.fromDate(new Date(input.endAt)) : null,
    allDay: input.allDay,
    location: input.location.trim(),
  };
}

/**
 * 月間カレンダー用。指定した月に 1 日でもかかっているイベントを開始順に返す。
 *
 * startAt だけで範囲を絞ると、前月から続く長いイベントが漏れるので
 * 開始日は前月頭まで広げて取り、月に重なるかどうかはメモリ側で判定する
 * (endAt も条件に入れると複合インデックスが要る)。
 */
export async function listEventsInMonth(
  monthKey: string,
): Promise<CircleEvent[]> {
  const db = getDb();
  const from = monthStartIso(shiftMonth(monthKey, -1));
  const to = monthStartIso(shiftMonth(monthKey, 1));

  const snap = await db
    .collection(COLLECTION)
    .where("startAt", ">=", Timestamp.fromDate(new Date(from)))
    .where("startAt", "<", Timestamp.fromDate(new Date(to)))
    .get();

  const events = snap.docs.map((doc) => toCircleEvent(doc.id, doc.data()));
  return filterEventsInMonth(events, monthKey).sort(byStartAtAsc);
}

/**
 * これからのイベントを開始順に返す。
 * 「今日」は日本時間で判定し、今日開催のものは開始時刻を過ぎていても含める。
 */
export async function listUpcomingEvents(
  limit = 10,
  now: Date = new Date(),
): Promise<CircleEvent[]> {
  const db = getDb();
  const todayStart = dateKeyToIso(todayJstKey(now));

  const snap = await db
    .collection(COLLECTION)
    .where("startAt", ">=", Timestamp.fromDate(new Date(todayStart)))
    .orderBy("startAt", "asc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => toCircleEvent(doc.id, doc.data()));
}

/**
 * 管理 UI 用。過去分も含めて全件を開始順に返す。
 * 古いものまで際限なく増えないよう、既定では 1 年前以降だけにする。
 */
export async function listEventsForAdmin(
  now: Date = new Date(),
): Promise<CircleEvent[]> {
  const db = getDb();
  const from = dateKeyToIso(addDays(todayJstKey(now), -365));

  const snap = await db
    .collection(COLLECTION)
    .where("startAt", ">=", Timestamp.fromDate(new Date(from)))
    .orderBy("startAt", "asc")
    .get();

  return snap.docs.map((doc) => toCircleEvent(doc.id, doc.data()));
}

export async function getEvent(id: string): Promise<CircleEvent | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toCircleEvent(snap.id, snap.data()!);
}

/** 作成してドキュメント ID を返す。ダッシュボードからの手入力なので source は manual */
export async function createEvent(
  input: EventInput,
  createdBy: string,
): Promise<string> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc();

  await ref.set({
    ...toDocumentFields(input),
    source: "manual",
    sourceRef: null,
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) {
    throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);
  }

  await ref.update({
    ...toDocumentFields(input),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) {
    throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);
  }
  await ref.delete();
}
