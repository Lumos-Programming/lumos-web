import { describe, it, expect, beforeEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { getEvent, listEventsInMonth } from "@/lib/events";
import type { SerializableWeekData } from "@/lib/mini-lt/firebase";
import {
  buildMiniLtEventInput,
  syncMiniLtCalendarEvent,
} from "./calendar-event";
import { EVENT_CONFIG } from "./utils";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

function talk(order: number, title: string, presenterName: string) {
  return {
    id: `talk-${order}`,
    title,
    description: "",
    duration: 5,
    presenterUid: `uid-${order}`,
    presenterName,
    presenterAvatar: "",
    order,
    createdAt: 0,
  };
}

function week(
  overrides: Partial<SerializableWeekData> = {},
): SerializableWeekData {
  return {
    weekString: "2026-W12",
    eventStartTime: "21:00",
    talks: [talk(1, "Rust 入門", "Alice")],
    ...overrides,
  };
}

describe("buildMiniLtEventInput", () => {
  it("starts on the configured weekday at the week's start time in JST", () => {
    // 2026-W12 の月曜は 3/16。21:00 JST = 12:00 UTC、終了は 24:00 JST
    const input = buildMiniLtEventInput("2026-W12", week());
    expect(input.title).toBe("mini LT (2026 / W12)");
    expect(input.startAt).toBe("2026-03-16T12:00:00.000Z");
    expect(input.endAt).toBe("2026-03-16T15:00:00.000Z");
    expect(input.allDay).toBe(false);
    expect(input.location).toBe("Discord ボイスチャンネル");
  });

  it("uses the Monday of ISO week 1 even when it falls in the previous year", () => {
    // 2026-W01 の月曜は 2025-12-29
    const input = buildMiniLtEventInput("2026-W01", week());
    expect(input.startAt).toBe("2025-12-29T12:00:00.000Z");
  });

  it("treats Sunday as the last day of the ISO week", () => {
    const input = buildMiniLtEventInput("2026-W12", week(), {
      ...EVENT_CONFIG,
      dayOfWeek: 0,
    });
    // 3/22 (日) 21:00 JST
    expect(input.startAt).toBe("2026-03-22T12:00:00.000Z");
  });

  it("honors a custom start time with minutes", () => {
    const input = buildMiniLtEventInput(
      "2026-W12",
      week({ eventStartTime: "20:30" }),
    );
    expect(input.startAt).toBe("2026-03-16T11:30:00.000Z");
  });

  it.each(["", "9:00", "24:00", "21:60", "abc"])(
    "falls back to the configured start hour for a broken time %j",
    (eventStartTime) => {
      const input = buildMiniLtEventInput("2026-W12", week({ eventStartTime }));
      expect(input.startAt).toBe("2026-03-16T12:00:00.000Z");
    },
  );

  it("drops the end time when the start is not before it", () => {
    const input = buildMiniLtEventInput("2026-W12", week(), {
      ...EVENT_CONFIG,
      endHour: 21,
    });
    expect(input.endAt).toBeNull();
  });

  it("lists talks by their order with presenter and duration", () => {
    const input = buildMiniLtEventInput(
      "2026-W12",
      week({
        talks: [talk(2, "Go の話", "Bob"), talk(1, "Rust 入門", "Alice")],
      }),
    );
    expect(input.description).toContain(
      "1. Rust 入門 - Alice (5分)\n2. Go の話 - Bob (5分)",
    );
    expect(input.description).toContain("https://mini-lt.lumos-ynu.jp");
  });
});

describe("syncMiniLtCalendarEvent", () => {
  const db = () => firebaseAdmin.firestore();

  async function saveWeek(weekId: string, talks: ReturnType<typeof talk>[]) {
    await db()
      .collection("weeks")
      .doc(weekId)
      .set({
        weekString: weekId,
        eventStartTime: "21:00",
        talks: talks.map((t) => ({
          ...t,
          createdAt: firebaseAdmin.firestore.Timestamp.now(),
        })),
      });
  }

  beforeEach(async () => {
    for (const collection of await db().listCollections()) {
      const docs = await collection.listDocuments();
      await Promise.all(docs.map((doc) => doc.delete()));
    }
  });

  it("adds a mini-lt event that shows up in the monthly calendar", async () => {
    await saveWeek("2026-W12", [talk(1, "Rust 入門", "Alice")]);
    await syncMiniLtCalendarEvent("2026-W12");

    const events = await listEventsInMonth("2026-03");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "mini-lt-2026-W12",
      title: "mini LT (2026 / W12)",
      source: "mini-lt",
      sourceRef: "2026-W12",
      createdBy: "",
      startAt: "2026-03-16T12:00:00.000Z",
    });
  });

  it("keeps one event per week and updates it in place", async () => {
    await saveWeek("2026-W12", [talk(1, "Rust 入門", "Alice")]);
    await syncMiniLtCalendarEvent("2026-W12");
    const first = await getEvent("mini-lt-2026-W12");

    await saveWeek("2026-W12", [
      talk(1, "Rust 入門", "Alice"),
      talk(2, "Go の話", "Bob"),
    ]);
    await syncMiniLtCalendarEvent("2026-W12");

    const snap = await db()
      .collection("events")
      .where("sourceRef", "==", "2026-W12")
      .get();
    expect(snap.size).toBe(1);
    const updated = await getEvent("mini-lt-2026-W12");
    expect(updated?.description).toContain("2. Go の話 - Bob");
    expect(updated?.createdAt).toBe(first?.createdAt);
  });

  it("removes the event once the last talk is gone", async () => {
    await saveWeek("2026-W12", [talk(1, "Rust 入門", "Alice")]);
    await syncMiniLtCalendarEvent("2026-W12");
    await saveWeek("2026-W12", []);
    await syncMiniLtCalendarEvent("2026-W12");
    expect(await getEvent("mini-lt-2026-W12")).toBeNull();
  });

  it("does nothing for a week without data", async () => {
    await syncMiniLtCalendarEvent("2026-W13");
    expect(await getEvent("mini-lt-2026-W13")).toBeNull();
  });

  it("does not touch manually created events", async () => {
    await db()
      .collection("events")
      .doc("manual-1")
      .set({
        title: "新歓",
        startAt: firebaseAdmin.firestore.Timestamp.fromDate(
          new Date("2026-03-16T10:00:00.000Z"),
        ),
        source: "manual",
        sourceRef: null,
      });
    await saveWeek("2026-W12", []);
    await syncMiniLtCalendarEvent("2026-W12");
    expect(await getEvent("manual-1")).not.toBeNull();
  });

  it("rejects an invalid week ID before touching Firestore", async () => {
    await expect(syncMiniLtCalendarEvent("2026-W99")).rejects.toThrow(
      "Invalid week ID",
    );
    await expect(syncMiniLtCalendarEvent("../events")).rejects.toThrow(
      "Invalid week ID",
    );
  });
});
