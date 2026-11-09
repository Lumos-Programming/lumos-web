import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";
import { isAttendableMember } from "@/lib/attendance";
import type { MemberDocument } from "@/lib/members";
import {
  collectAnswerUsage,
  findSurveyChangeConflict,
  surveyDefinitionSchema,
  validateSurveyAnswers,
} from "@/lib/survey-form";
import { EVENT_ERROR_CODES, EventError, type LumosEvent } from "@/types/event";
import type {
  SurveyAnswers,
  SurveyDefinition,
  SurveyResponse,
} from "@/types/survey";

/**
 * イベントの事前アンケート。
 * - 質問: events/{eventId}.survey ({ questions } または null)
 * - 回答: events/{eventId}/surveyResponses/{memberId}
 *
 * 回答は参加予定を事前に聞くためのもので、出席の記録 (lib/attendance.ts) とは別。
 * 回答しただけでは出席扱いにしない。回答はイベント開始まで何度でも直せる。
 */

const EVENTS = "events";
const SURVEY_RESPONSES = "surveyResponses";

function responsesOf(eventId: string) {
  return getDb().collection(EVENTS).doc(eventId).collection(SURVEY_RESPONSES);
}

/** 回答を受け付けているか。アンケートがあり、イベント開始前であること */
export function isSurveyOpen(
  event: Pick<LumosEvent, "survey" | "startAt">,
  now: Date = new Date(),
): boolean {
  return event.survey !== null && now < new Date(event.startAt);
}

const surveyBodySchema = z.strictObject({ survey: z.unknown() });

/**
 * 質問を保存する PUT のボディ ({ survey: {...} | null }) を検証する。
 * null はアンケートを外す指定。不正なら EventError(INVALID_SURVEY)。
 */
export function parseSurveyBody(body: unknown): SurveyDefinition | null {
  const outer = surveyBodySchema.safeParse(body);
  if (!outer.success || outer.data.survey === undefined) {
    throw new EventError(EVENT_ERROR_CODES.INVALID_SURVEY);
  }
  if (outer.data.survey === null) return null;

  const parsed = surveyDefinitionSchema.safeParse(outer.data.survey);
  if (!parsed.success) {
    throw new EventError(
      EVENT_ERROR_CODES.INVALID_SURVEY,
      parsed.error.issues[0]?.message,
    );
  }
  return parsed.data;
}

const answerBodySchema = z.strictObject({
  answers: z.record(z.string(), z.unknown()),
});

/**
 * 回答の PUT のボディ ({ answers: {...} }) の外側の形だけを見る。
 * 中身は質問定義が要るので submitSurveyResponse のトランザクション内で検証する。
 */
export function parseSurveyAnswerBody(body: unknown): Record<string, unknown> {
  const parsed = answerBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new EventError(EVENT_ERROR_CODES.INVALID_SURVEY_ANSWER);
  }
  return parsed.data.answers;
}

/**
 * 質問を保存する (null ならアンケートを外す)。
 * 回答がある質問の削除・種類変更・選ばれている選択肢の削除は
 * EventError(SURVEY_CHANGE_CONFLICT) で拒否する (lib/survey-form.ts の findSurveyChangeConflict)。
 */
export async function setEventSurvey(
  eventId: string,
  survey: SurveyDefinition | null,
): Promise<void> {
  const db = getDb();
  const eventRef = db.collection(EVENTS).doc(eventId);

  await db.runTransaction(async (tx) => {
    const [eventSnap, responsesSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(eventRef.collection(SURVEY_RESPONSES)),
    ]);
    if (!eventSnap.exists) throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);

    const before: SurveyDefinition | null = eventSnap.data()!.survey ?? null;
    const usage = collectAnswerUsage(
      responsesSnap.docs.map((d) => (d.data().answers ?? {}) as SurveyAnswers),
    );
    const conflict = findSurveyChangeConflict(
      before?.questions ?? [],
      survey,
      usage,
    );
    if (conflict) {
      throw new EventError(EVENT_ERROR_CODES.SURVEY_CHANGE_CONFLICT, conflict);
    }

    tx.update(eventRef, {
      survey,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * 回答を保存する。2 回目以降は上書きし、最初の回答日時 (submittedAt) は残す。
 * イベント開始時刻を過ぎたら受け付けない。
 */
export async function submitSurveyResponse(
  eventId: string,
  memberId: string,
  rawAnswers: unknown,
  now: Date = new Date(),
): Promise<{ created: boolean }> {
  const db = getDb();
  const eventRef = db.collection(EVENTS).doc(eventId);
  const memberRef = db.collection("members").doc(memberId);
  const responseRef = eventRef.collection(SURVEY_RESPONSES).doc(memberId);

  return db.runTransaction(async (tx) => {
    const [eventSnap, memberSnap, responseSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(memberRef),
      tx.get(responseRef),
    ]);
    if (!eventSnap.exists) throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);
    const event = eventSnap.data()!;
    const survey: SurveyDefinition | null = event.survey ?? null;
    if (!survey) throw new EventError(EVENT_ERROR_CODES.SURVEY_NOT_FOUND);
    if (now >= event.startAt.toDate()) {
      throw new EventError(EVENT_ERROR_CODES.SURVEY_CLOSED);
    }
    if (!isAttendableMember(memberSnap.data() as Partial<MemberDocument>)) {
      throw new EventError(EVENT_ERROR_CODES.MEMBER_NOT_FOUND);
    }

    const answers = validateSurveyAnswers(survey.questions, rawAnswers);
    if (!answers) throw new EventError(EVENT_ERROR_CODES.INVALID_SURVEY_ANSWER);

    if (responseSnap.exists) {
      tx.update(responseRef, {
        answers,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { created: false };
    }
    tx.set(responseRef, {
      memberId,
      answers,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { created: true };
  });
}

function toSurveyResponse(
  id: string,
  data: FirebaseFirestore.DocumentData,
): SurveyResponse {
  return {
    memberId: id,
    answers: data.answers ?? {},
    submittedAt: data.submittedAt
      ? data.submittedAt.toDate().toISOString()
      : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
  };
}

/** 自分の回答。未回答なら null */
export async function getSurveyResponse(
  eventId: string,
  memberId: string,
): Promise<SurveyResponse | null> {
  const snap = await responsesOf(eventId).doc(memberId).get();
  return snap.exists ? toSurveyResponse(snap.id, snap.data()!) : null;
}

/** イベントの回答を最初に回答した順で返す */
export async function listSurveyResponses(
  eventId: string,
): Promise<SurveyResponse[]> {
  const snap = await responsesOf(eventId).orderBy("submittedAt", "asc").get();
  return snap.docs.map((doc) => toSurveyResponse(doc.id, doc.data()));
}

/** 指定したイベントのうち、memberId が回答済みのものの ID を返す */
export async function listAnsweredEventIds(
  memberId: string,
  eventIds: string[],
): Promise<string[]> {
  if (eventIds.length === 0) return [];
  const refs = eventIds.map((id) => responsesOf(id).doc(memberId));
  const snaps = await getDb().getAll(...refs);
  return snaps.filter((s) => s.exists).map((s) => s.ref.parent.parent!.id);
}
