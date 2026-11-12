import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { EVENT_ERROR_CODES, EventError } from "@/types/event";
import type { SurveyDefinition } from "@/types/survey";
import {
  getSurveyResponse,
  isSurveyOpen,
  listAnsweredEventIds,
  listSurveyResponses,
  parseSurveyAnswerBody,
  parseSurveyBody,
  setEventSurvey,
  submitSurveyResponse,
} from "./survey";
import { listAttendances } from "./attendance";
import { createEvent, deleteEvent, getEvent, updateEvent } from "./events";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = () => firebaseAdmin.firestore();

const START = "2026-11-13T09:00:00.000Z";
const BEFORE_START = new Date("2026-11-13T08:59:59.000Z");

const SURVEY: SurveyDefinition = {
  questions: [
    {
      id: "q_join",
      type: "choice",
      label: "参加",
      required: true,
      options: ["参加", "不参加"],
    },
    { id: "q_rate", type: "rating", label: "期待度", required: false },
    { id: "q_memo", type: "text", label: "ひとこと", required: false },
  ],
};

const EVENT_INPUT = {
  title: "作業会",
  description: "",
  startAt: START,
  endAt: "2026-11-13T12:00:00.000Z",
  allDay: false,
  location: "",
};

async function expectEventError(
  promise: Promise<unknown> | (() => unknown),
  code: (typeof EVENT_ERROR_CODES)[keyof typeof EVENT_ERROR_CODES],
): Promise<EventError> {
  try {
    await (typeof promise === "function" ? promise() : promise);
  } catch (e) {
    expect(e).toBeInstanceOf(EventError);
    expect((e as EventError).code).toBe(code);
    return e as EventError;
  }
  throw new Error("EventError が投げられなかった");
}

async function newEvent(survey: SurveyDefinition | null = SURVEY) {
  const id = await createEvent(EVENT_INPUT, "admin-1");
  if (survey) await setEventSurvey(id, survey);
  return id;
}

async function addMember(id: string, data: Record<string, unknown> = {}) {
  await db()
    .collection("members")
    .doc(id)
    .set({ onboardingCompleted: true, ...data });
}

const answer = (
  eventId: string,
  memberId: string,
  answers: unknown,
  now = BEFORE_START,
) => submitSurveyResponse(eventId, memberId, answers, now);

beforeEach(async () => {
  await db().recursiveDelete(db().collection("events"));
  await db().recursiveDelete(db().collection("members"));
});

describe("setEventSurvey", () => {
  it("saves the survey and getEvent returns it", async () => {
    const id = await newEvent();
    expect((await getEvent(id))!.survey).toEqual(SURVEY);
  });

  it("events without a survey have survey: null", async () => {
    const id = await newEvent(null);
    expect((await getEvent(id))!.survey).toBeNull();
  });

  it("keeps the survey when the event itself is edited", async () => {
    const id = await newEvent();
    await updateEvent(id, { ...EVENT_INPUT, title: "改名" });
    expect((await getEvent(id))!.survey).toEqual(SURVEY);
  });

  it("rejects a missing event", async () => {
    await expectEventError(
      setEventSurvey("no-such-event", SURVEY),
      EVENT_ERROR_CODES.NOT_FOUND,
    );
  });

  it("blocks removing an answered question but allows label edits", async () => {
    const id = await newEvent();
    await addMember("alice");
    await answer(id, "alice", { q_join: "参加", q_rate: 4 });

    const err = await expectEventError(
      setEventSurvey(id, { questions: [SURVEY.questions[0]] }),
      EVENT_ERROR_CODES.SURVEY_CHANGE_CONFLICT,
    );
    expect(err.message).toContain("期待度");

    // 回答の無い自由記述は消せる。質問文の変更も可
    const edited: SurveyDefinition = {
      questions: [
        { ...SURVEY.questions[0], label: "参加しますか？" },
        SURVEY.questions[1],
      ],
    };
    await setEventSurvey(id, edited);
    expect((await getEvent(id))!.survey).toEqual(edited);
  });

  it("blocks removing the survey once someone has answered", async () => {
    const id = await newEvent();
    await addMember("alice");
    await answer(id, "alice", { q_join: "参加" });
    await expectEventError(
      setEventSurvey(id, null),
      EVENT_ERROR_CODES.SURVEY_CHANGE_CONFLICT,
    );
  });

  it("allows removing the survey when no one has answered", async () => {
    const id = await newEvent();
    await setEventSurvey(id, null);
    expect((await getEvent(id))!.survey).toBeNull();
  });
});

describe("submitSurveyResponse", () => {
  it("saves a new response", async () => {
    const id = await newEvent();
    await addMember("alice");
    expect(
      await answer(id, "alice", { q_join: "参加", q_memo: " よろしく " }),
    ).toEqual({
      created: true,
    });
    const res = await getSurveyResponse(id, "alice");
    expect(res).toMatchObject({
      memberId: "alice",
      answers: { q_join: "参加", q_memo: "よろしく" },
    });
    expect(res!.submittedAt).toEqual(expect.any(String));
  });

  it("does not record attendance", async () => {
    const id = await newEvent();
    await addMember("alice");
    await answer(id, "alice", { q_join: "参加" });
    expect(await listAttendances(id)).toEqual([]);
  });

  it("overwrites on re-answer and keeps the first submittedAt", async () => {
    const id = await newEvent();
    await addMember("alice");
    await answer(id, "alice", { q_join: "参加", q_rate: 5, q_memo: "楽しみ" });
    const first = await getSurveyResponse(id, "alice");

    await new Promise((r) => setTimeout(r, 20));
    expect(await answer(id, "alice", { q_join: "不参加" })).toEqual({
      created: false,
    });
    const second = await getSurveyResponse(id, "alice");
    // 省いた任意項目は前回の値が残らない (丸ごと置き換え)
    expect(second!.answers).toEqual({ q_join: "不参加" });
    expect(second!.submittedAt).toBe(first!.submittedAt);
    expect(second!.updatedAt! > first!.updatedAt!).toBe(true);
    expect(await listSurveyResponses(id)).toHaveLength(1);
  });

  it("rejects answers at or after the event start", async () => {
    const id = await newEvent();
    await addMember("alice");
    for (const now of [new Date(START), new Date("2026-11-14T00:00:00Z")]) {
      await expectEventError(
        answer(id, "alice", { q_join: "参加" }, now),
        EVENT_ERROR_CODES.SURVEY_CLOSED,
      );
    }
    expect(await getSurveyResponse(id, "alice")).toBeNull();
  });

  it("rejects editing an existing answer after the start", async () => {
    const id = await newEvent();
    await addMember("alice");
    await answer(id, "alice", { q_join: "参加" });
    await expectEventError(
      answer(id, "alice", { q_join: "不参加" }, new Date(START)),
      EVENT_ERROR_CODES.SURVEY_CLOSED,
    );
    expect((await getSurveyResponse(id, "alice"))!.answers).toEqual({
      q_join: "参加",
    });
  });

  it("rejects an event without a survey", async () => {
    const id = await newEvent(null);
    await addMember("alice");
    await expectEventError(
      answer(id, "alice", { q_join: "参加" }),
      EVENT_ERROR_CODES.SURVEY_NOT_FOUND,
    );
  });

  it("rejects a missing event", async () => {
    await addMember("alice");
    await expectEventError(
      answer("no-such-event", "alice", { q_join: "参加" }),
      EVENT_ERROR_CODES.NOT_FOUND,
    );
  });

  it.each([
    { name: "missing member", setup: async () => {} },
    {
      name: "opted-out member",
      setup: () => addMember("alice", { optedOut: true }),
    },
    {
      name: "sub-account",
      setup: () => addMember("alice", { isSubAccount: true }),
    },
  ])("rejects a $name", async ({ setup }) => {
    const id = await newEvent();
    await setup();
    await expectEventError(
      answer(id, "alice", { q_join: "参加" }),
      EVENT_ERROR_CODES.MEMBER_NOT_FOUND,
    );
    expect(await listSurveyResponses(id)).toEqual([]);
  });

  it.each([
    { name: "missing required", value: { q_rate: 3 } },
    { name: "rating 0", value: { q_join: "参加", q_rate: 0 } },
    { name: "rating 6", value: { q_join: "参加", q_rate: 6 } },
    { name: "rating 2.5", value: { q_join: "参加", q_rate: 2.5 } },
    { name: "choice not in options", value: { q_join: "たぶん" } },
    {
      name: "too long text",
      value: { q_join: "参加", q_memo: "あ".repeat(2001) },
    },
    { name: "unknown question id", value: { q_join: "参加", q_x: 1 } },
  ])("rejects invalid answers: $name", async ({ value }) => {
    const id = await newEvent();
    await addMember("alice");
    await expectEventError(
      answer(id, "alice", value),
      EVENT_ERROR_CODES.INVALID_SURVEY_ANSWER,
    );
    expect(await getSurveyResponse(id, "alice")).toBeNull();
  });
});

describe("listAnsweredEventIds", () => {
  it("returns only events the member answered", async () => {
    const a = await newEvent();
    const b = await newEvent();
    const c = await newEvent(null);
    await addMember("alice");
    await addMember("bob");
    await answer(a, "alice", { q_join: "参加" });
    await answer(b, "bob", { q_join: "参加" });
    expect(await listAnsweredEventIds("alice", [a, b, c])).toEqual([a]);
    expect(await listAnsweredEventIds("alice", [])).toEqual([]);
  });
});

describe("deleteEvent", () => {
  it("also deletes the survey responses", async () => {
    const id = await newEvent();
    await addMember("alice");
    await answer(id, "alice", { q_join: "参加" });
    await deleteEvent(id);
    const left = await db()
      .collection("events")
      .doc(id)
      .collection("surveyResponses")
      .get();
    expect(left.empty).toBe(true);
  });
});

describe("isSurveyOpen", () => {
  const event = { survey: SURVEY, startAt: START };
  it("is open only before the start and only with a survey", () => {
    expect(isSurveyOpen(event, BEFORE_START)).toBe(true);
    expect(isSurveyOpen(event, new Date(START))).toBe(false);
    expect(isSurveyOpen({ ...event, survey: null }, BEFORE_START)).toBe(false);
  });
});

describe("body parsing", () => {
  it("parses a survey body and null", () => {
    expect(parseSurveyBody({ survey: SURVEY })).toEqual(SURVEY);
    expect(parseSurveyBody({ survey: null })).toBeNull();
  });

  it.each([
    null,
    {},
    { survey: SURVEY, extra: 1 },
    { survey: { questions: [] } },
  ])("rejects survey body %j", async (body) => {
    await expectEventError(
      () => parseSurveyBody(body),
      EVENT_ERROR_CODES.INVALID_SURVEY,
    );
  });

  it("passes through the message of the first problem", async () => {
    const err = await expectEventError(
      () =>
        parseSurveyBody({
          survey: { questions: [{ ...SURVEY.questions[1], label: "" }] },
        }),
      EVENT_ERROR_CODES.INVALID_SURVEY,
    );
    expect(err.message).toBe("質問文を入力してください");
  });

  it.each([null, "x", {}, { answers: [] }, { answers: {}, memberId: "bob" }])(
    "rejects answer body %j",
    async (body) => {
      await expectEventError(
        () => parseSurveyAnswerBody(body),
        EVENT_ERROR_CODES.INVALID_SURVEY_ANSWER,
      );
    },
  );
});
