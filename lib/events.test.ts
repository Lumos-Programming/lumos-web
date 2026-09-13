import { describe, it, expect, beforeEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { EVENT_ERROR_CODES, EventError } from "@/types/event";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEventsForAdmin,
  listEventsInMonth,
  listUpcomingEvents,
  parseEventInput,
  updateEvent,
} from "./events";
import {
  eventDateRange,
  formatEventSchedule,
  jstLocalToIso,
  monthGridDays,
  shiftMonth,
  toJstDateKey,
  toJstDatetimeLocal,
} from "./events-format";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

/** 例外が期待した EventError かどうかをコードで確かめる */
async function expectEventError(
  fn: () => unknown,
  code: (typeof EVENT_ERROR_CODES)[keyof typeof EVENT_ERROR_CODES],
) {
  try {
    await fn();
  } catch (e) {
    expect(e).toBeInstanceOf(EventError);
    expect((e as EventError).code).toBe(code);
    return;
  }
  throw new Error("EventError が投げられなかった");
}

const ADMIN = "admin-1";

/** 日本時間の datetime-local 文字列からテスト用の入力を組む */
function input(
  startLocal: string,
  overrides: Partial<Parameters<typeof createEvent>[0]> & {
    endLocal?: string | null;
  } = {},
) {
  const { endLocal, ...rest } = overrides;
  return {
    title: "テストイベント",
    description: "",
    startAt: jstLocalToIso(startLocal)!,
    endAt: endLocal ? jstLocalToIso(endLocal) : null,
    allDay: false,
    location: "",
    ...rest,
  };
}

describe("events-format", () => {
  it("converts between JST datetime-local and ISO", () => {
    const iso = jstLocalToIso("2026-09-20T19:30");
    expect(iso).toBe("2026-09-20T10:30:00.000Z");
    expect(toJstDatetimeLocal(iso!)).toBe("2026-09-20T19:30");
    expect(jstLocalToIso("2026-09-20")).toBe("2026-09-19T15:00:00.000Z");
    expect(jstLocalToIso("not a date")).toBeNull();
  });

  it("uses the JST date even when UTC is still the previous day", () => {
    // 日本時間 9/20 0:30 は UTC では 9/19
    expect(toJstDateKey("2026-09-19T15:30:00.000Z")).toBe("2026-09-20");
  });

  it("builds a Sunday-first month grid with whole weeks", () => {
    // 2026-09-01 は火曜
    const days = monthGridDays("2026-09");
    expect(days[0]).toBe("2026-08-30");
    expect(days.at(-1)).toBe("2026-10-03");
    expect(days.length % 7).toBe(0);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("treats an event ending at exactly 0:00 as ending the day before", () => {
    const event = {
      ...input("2026-09-20T22:00", { endLocal: "2026-09-21T00:00" }),
      id: "x",
      source: "manual" as const,
      sourceRef: null,
      createdBy: "",
      createdAt: null,
      updatedAt: null,
    };
    expect(eventDateRange(event)).toEqual({
      start: "2026-09-20",
      end: "2026-09-20",
    });
    // 終日は最終日を含む
    const allDay = {
      ...event,
      allDay: true,
      startAt: jstLocalToIso("2026-09-20")!,
      endAt: jstLocalToIso("2026-09-22")!,
    };
    expect(eventDateRange(allDay)).toEqual({
      start: "2026-09-20",
      end: "2026-09-22",
    });
    const now = new Date("2026-09-13T00:00:00+09:00");
    expect(formatEventSchedule(allDay, now)).toBe("9月20日(日)〜22日(火)");
    expect(formatEventSchedule(event, now)).toBe(
      "9月20日(日) 22:00〜9月21日(月) 00:00",
    );
    expect(
      formatEventSchedule(
        { ...event, endAt: jstLocalToIso("2026-09-20T23:00") },
        now,
      ),
    ).toBe("9月20日(日) 22:00〜23:00");
    // 今年でなければ年を付ける
    expect(
      formatEventSchedule(event, new Date("2027-01-01T00:00:00+09:00")),
    ).toBe("2026年9月20日(日) 22:00〜9月21日(月) 00:00");
  });
});

describe("parseEventInput", () => {
  it("normalizes a valid body", () => {
    const parsed = parseEventInput({
      title: " 新歓 ",
      startAt: "2026-04-10T18:00:00+09:00",
      endAt: "2026-04-10T20:00:00+09:00",
    });
    expect(parsed.startAt).toBe("2026-04-10T09:00:00.000Z");
    expect(parsed.endAt).toBe("2026-04-10T11:00:00.000Z");
    expect(parsed.allDay).toBe(false);
    expect(parsed.description).toBe("");
  });

  it("rejects malformed bodies and dates", async () => {
    await expectEventError(
      () => parseEventInput(null),
      EVENT_ERROR_CODES.INVALID_INPUT,
    );
    await expectEventError(
      () => parseEventInput({ title: "", startAt: "2026-04-10T18:00:00Z" }),
      EVENT_ERROR_CODES.TITLE_REQUIRED,
    );
    await expectEventError(
      () => parseEventInput({ title: "x", startAt: "yesterday" }),
      EVENT_ERROR_CODES.INVALID_START_AT,
    );
    await expectEventError(
      () =>
        parseEventInput({
          title: "x",
          startAt: "2026-04-10T18:00:00Z",
          endAt: "soon",
        }),
      EVENT_ERROR_CODES.INVALID_END_AT,
    );
    await expectEventError(
      () =>
        parseEventInput({
          title: "x",
          startAt: "2026-04-10T18:00:00Z",
          endAt: "2026-04-10T18:00:00Z",
        }),
      EVENT_ERROR_CODES.END_BEFORE_START,
    );
  });

  it("allows an all-day event to end on the same day it starts", () => {
    const parsed = parseEventInput({
      title: "合宿",
      startAt: "2026-08-01T00:00:00+09:00",
      endAt: "2026-08-01T00:00:00+09:00",
      allDay: true,
    });
    expect(parsed.endAt).toBe(parsed.startAt);
  });
});

describe("events CRUD", () => {
  beforeEach(async () => {
    const db = firebaseAdmin.firestore();
    const collections = await db.listCollections();
    for (const collection of collections) {
      const docs = await collection.listDocuments();
      for (const doc of docs) {
        await doc.delete();
      }
    }
  });

  it("creates, reads, updates and deletes an event", async () => {
    const id = await createEvent(
      input("2026-09-20T19:00", { endLocal: "2026-09-20T21:00" }),
      ADMIN,
    );

    const created = await getEvent(id);
    expect(created).not.toBeNull();
    expect(created!.title).toBe("テストイベント");
    expect(created!.startAt).toBe("2026-09-20T10:00:00.000Z");
    expect(created!.endAt).toBe("2026-09-20T12:00:00.000Z");
    expect(created!.source).toBe("manual");
    expect(created!.createdBy).toBe(ADMIN);

    await updateEvent(id, input("2026-09-21T19:00", { title: "変更後" }));
    const updated = await getEvent(id);
    expect(updated!.title).toBe("変更後");
    expect(updated!.endAt).toBeNull();
    // 出どころと作成者は更新で変わらない
    expect(updated!.createdBy).toBe(ADMIN);

    await deleteEvent(id);
    expect(await getEvent(id)).toBeNull();
  });

  it("throws NOT_FOUND for missing ids", async () => {
    await expectEventError(
      () => updateEvent("nope", input("2026-09-20T19:00")),
      EVENT_ERROR_CODES.NOT_FOUND,
    );
    await expectEventError(
      () => deleteEvent("nope"),
      EVENT_ERROR_CODES.NOT_FOUND,
    );
  });

  it("lists events overlapping a month, including ones that started earlier", async () => {
    await createEvent(input("2026-08-05T19:00", { title: "8月" }), ADMIN);
    // 8/30 開始で 9/1 まで続く → 9 月にもかかる
    await createEvent(
      input("2026-08-30", {
        title: "月またぎ",
        allDay: true,
        endLocal: "2026-09-01",
      }),
      ADMIN,
    );
    await createEvent(input("2026-09-15T19:00", { title: "9月" }), ADMIN);
    // 日本時間 10/1 0:30 は UTC ではまだ 9/30
    await createEvent(input("2026-10-01T00:30", { title: "10月" }), ADMIN);

    const titles = (await listEventsInMonth("2026-09")).map((e) => e.title);
    expect(titles).toEqual(["月またぎ", "9月"]);
  });

  it("lists upcoming events from the start of today in JST", async () => {
    const now = new Date("2026-09-20T05:00:00.000Z"); // 日本時間 9/20 14:00
    await createEvent(input("2026-09-19T21:00", { title: "昨日" }), ADMIN);
    await createEvent(input("2026-09-20T10:00", { title: "今朝" }), ADMIN);
    await createEvent(input("2026-09-25T19:00", { title: "来週" }), ADMIN);
    await createEvent(input("2026-09-22T19:00", { title: "明後日" }), ADMIN);

    const titles = (await listUpcomingEvents(10, now)).map((e) => e.title);
    expect(titles).toEqual(["今朝", "明後日", "来週"]);
    expect(await listUpcomingEvents(1, now)).toHaveLength(1);
  });

  it("lists admin events from a year ago onward", async () => {
    const now = new Date("2026-09-20T05:00:00.000Z");
    await createEvent(input("2025-01-01T19:00", { title: "古い" }), ADMIN);
    await createEvent(input("2026-01-01T19:00", { title: "今年" }), ADMIN);
    await createEvent(input("2026-12-01T19:00", { title: "先" }), ADMIN);

    const titles = (await listEventsForAdmin(now)).map((e) => e.title);
    expect(titles).toEqual(["今年", "先"]);
  });
});
