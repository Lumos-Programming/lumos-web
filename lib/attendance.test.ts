import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { EVENT_ERROR_CODES, EventError } from "@/types/event";
import {
  listAttendanceCandidates,
  listAttendances,
  parseAttendanceBody,
  parseMemberIdParam,
  recordAttendance,
  removeAttendance,
} from "./attendance";
import { createEvent, deleteEvent } from "./events";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = () => firebaseAdmin.firestore();

async function expectEventError(
  promise: Promise<unknown> | (() => unknown),
  code: (typeof EVENT_ERROR_CODES)[keyof typeof EVENT_ERROR_CODES],
) {
  try {
    await (typeof promise === "function" ? promise() : promise);
  } catch (e) {
    expect(e).toBeInstanceOf(EventError);
    expect((e as EventError).code).toBe(code);
    return;
  }
  throw new Error("EventError が投げられなかった");
}

async function newEvent() {
  return createEvent(
    {
      title: "作業会",
      description: "",
      startAt: "2026-11-13T09:00:00.000Z",
      endAt: "2026-11-13T12:00:00.000Z",
      allDay: false,
      location: "",
    },
    "admin-1",
  );
}

async function addMember(id: string, data: Record<string, unknown> = {}) {
  await db()
    .collection("members")
    .doc(id)
    .set({ onboardingCompleted: true, ...data });
}

beforeEach(async () => {
  await db().recursiveDelete(db().collection("events"));
  await db().recursiveDelete(db().collection("members"));
  await db().recursiveDelete(db().collection("pointTransactions"));
});

describe("recordAttendance", () => {
  it("records a new attendance", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    expect(await recordAttendance(eventId, "alice", "admin-1")).toEqual({
      created: true,
    });
    const list = await listAttendances(eventId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ memberId: "alice", recordedBy: "admin-1" });
    expect(list[0].recordedAt).toEqual(expect.any(String));
  });

  it("is idempotent and keeps the first recorder", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    await recordAttendance(eventId, "alice", "admin-1");
    expect(await recordAttendance(eventId, "alice", "admin-2")).toEqual({
      created: false,
    });
    const list = await listAttendances(eventId);
    expect(list).toHaveLength(1);
    expect(list[0].recordedBy).toBe("admin-1");
  });

  it("returns created: true for exactly one of concurrent requests", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    const results = await Promise.all([
      recordAttendance(eventId, "alice", "admin-1"),
      recordAttendance(eventId, "alice", "admin-2"),
    ]);
    expect(results.filter((r) => r.created)).toHaveLength(1);
  });

  it("rejects a missing event", async () => {
    await addMember("alice");
    await expectEventError(
      recordAttendance("no-such-event", "alice", "admin-1"),
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
    const eventId = await newEvent();
    await setup();
    await expectEventError(
      recordAttendance(eventId, "alice", "admin-1"),
      EVENT_ERROR_CODES.MEMBER_NOT_FOUND,
    );
    expect(await listAttendances(eventId)).toEqual([]);
  });

  it("allows a member who has not finished onboarding (walk-in)", async () => {
    const eventId = await newEvent();
    await addMember("newbie", { onboardingCompleted: false });
    expect(await recordAttendance(eventId, "newbie", "admin-1")).toEqual({
      created: true,
    });
  });
});

describe("attendance points", () => {
  const pointsOf = async (memberId: string) =>
    (
      await db()
        .collection("pointTransactions")
        .where("memberId", "==", memberId)
        .get()
    ).docs.map((d) => d.data());

  it("awards attendance points once, with the event title", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    await recordAttendance(eventId, "alice", "admin-1");
    await recordAttendance(eventId, "alice", "admin-2");
    const points = await pointsOf("alice");
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      reason: "event_attended",
      points: 5,
      description: "作業会",
    });
  });

  it("awards separately per event", async () => {
    const a = await newEvent();
    const b = await newEvent();
    await addMember("alice");
    await recordAttendance(a, "alice", "admin-1");
    await recordAttendance(b, "alice", "admin-1");
    expect(await pointsOf("alice")).toHaveLength(2);
  });

  it("does not award points when recording fails", async () => {
    const eventId = await newEvent();
    await addMember("alice", { optedOut: true });
    await recordAttendance(eventId, "alice", "admin-1").catch(() => {});
    expect(await pointsOf("alice")).toEqual([]);
  });

  it("revokes the points when the attendance is removed", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    await recordAttendance(eventId, "alice", "admin-1");
    await removeAttendance(eventId, "alice");
    expect(await pointsOf("alice")).toEqual([]);
  });
});

describe("removeAttendance", () => {
  it("removes an existing attendance", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    await recordAttendance(eventId, "alice", "admin-1");
    expect(await removeAttendance(eventId, "alice")).toEqual({ removed: true });
    expect(await listAttendances(eventId)).toEqual([]);
  });

  it("returns removed: false when there was no record", async () => {
    const eventId = await newEvent();
    expect(await removeAttendance(eventId, "alice")).toEqual({
      removed: false,
    });
  });

  it("rejects a missing event", async () => {
    await expectEventError(
      removeAttendance("no-such-event", "alice"),
      EVENT_ERROR_CODES.NOT_FOUND,
    );
  });

  it("can re-record after removal", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    await recordAttendance(eventId, "alice", "admin-1");
    await removeAttendance(eventId, "alice");
    expect(await recordAttendance(eventId, "alice", "admin-2")).toEqual({
      created: true,
    });
  });
});

describe("listAttendances", () => {
  it("returns an empty list for an event without records", async () => {
    expect(await listAttendances(await newEvent())).toEqual([]);
  });

  it("keeps attendances separate per event", async () => {
    const a = await newEvent();
    const b = await newEvent();
    await addMember("alice");
    await addMember("bob");
    await recordAttendance(a, "alice", "admin-1");
    await recordAttendance(b, "bob", "admin-1");
    expect((await listAttendances(a)).map((x) => x.memberId)).toEqual([
      "alice",
    ]);
  });

  it("orders by registration time", async () => {
    const eventId = await newEvent();
    for (const id of ["carol", "alice", "bob"]) {
      await addMember(id);
      await recordAttendance(eventId, id, "admin-1");
    }
    expect((await listAttendances(eventId)).map((x) => x.memberId)).toEqual([
      "carol",
      "alice",
      "bob",
    ]);
  });
});

describe("deleteEvent", () => {
  it("also deletes the attendance records", async () => {
    const eventId = await newEvent();
    await addMember("alice");
    await recordAttendance(eventId, "alice", "admin-1");
    await deleteEvent(eventId);
    const left = await db()
      .collection("events")
      .doc(eventId)
      .collection("attendances")
      .get();
    expect(left.empty).toBe(true);
  });
});

describe("listAttendanceCandidates", () => {
  it("returns only active main accounts that finished onboarding, sorted", async () => {
    await addMember("u1", {
      lastName: "山田",
      firstName: "太郎",
      nickname: "やまちゃん",
      discordUsername: "yamada",
      discordAvatar: "https://example.test/a.png",
    });
    await addMember("u2", { lastName: "安藤", firstName: "花子" });
    await addMember("u3", { nickname: "ニック" });
    await addMember("left", { lastName: "退会", optedOut: true });
    await addMember("sub", { lastName: "サブ", isSubAccount: true });
    await addMember("new", { lastName: "新人", onboardingCompleted: false });

    const list = await listAttendanceCandidates();
    expect(list.map((c) => c.id).sort()).toEqual(["u1", "u2", "u3"]);
    expect(list.find((c) => c.id === "u1")).toEqual({
      id: "u1",
      fullName: "山田 太郎",
      nickname: "やまちゃん",
      discordUsername: "yamada",
      avatar: "https://example.test/a.png",
    });
    expect(list.find((c) => c.id === "u3")!.fullName).toBe("");
  });
});

describe("input parsing", () => {
  it("accepts and trims a member ID", () => {
    expect(parseAttendanceBody({ memberId: " 123 " })).toBe("123");
    expect(parseMemberIdParam("123")).toBe("123");
  });

  it.each([
    null,
    "123",
    {},
    { memberId: "" },
    { memberId: "   " },
    { memberId: 123 },
    { memberId: "a/b" },
    { memberId: "x".repeat(129) },
  ])("rejects body %j", (body) =>
    expectEventError(
      () => parseAttendanceBody(body),
      EVENT_ERROR_CODES.INVALID_INPUT,
    ),
  );

  it.each(["", "a/b"])("rejects path param %j", (value) =>
    expectEventError(
      () => parseMemberIdParam(value),
      EVENT_ERROR_CODES.INVALID_INPUT,
    ),
  );
});
