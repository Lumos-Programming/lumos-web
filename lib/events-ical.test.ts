import { describe, expect, it } from "vitest";
import { toICalendar } from "@/lib/events-ical";
import type { LumosEvent } from "@/types/event";

const baseEvent: LumosEvent = {
  id: "welcome-2026",
  title: "新歓ハッカソン",
  description: "参加無料\n持ち物: PC",
  startAt: "2026-04-10T09:00:00.000Z",
  endAt: "2026-04-10T11:00:00.000Z",
  allDay: false,
  location: "横浜, A棟; 101",
  source: "manual",
  sourceRef: null,
  createdBy: "",
  createdAt: null,
  updatedAt: "2026-04-01T00:00:00.000Z",
};

describe("toICalendar", () => {
  it("exports timed events in UTC and escapes iCalendar text", () => {
    const calendar = toICalendar([baseEvent], new Date("2026-04-01T12:00:00Z"));

    expect(calendar).toContain("UID:welcome-2026@lumos-ynu.jp\r\n");
    expect(calendar).toContain("METHOD:PUBLISH");
    expect(calendar).toContain("DTSTART:20260410T090000Z");
    expect(calendar).toContain("DTEND:20260410T110000Z");
    expect(calendar).toContain("DESCRIPTION:参加無料\\n持ち物: PC");
    expect(calendar).toContain("LOCATION:横浜\\, A棟\\; 101");
    expect(calendar).toContain("LAST-MODIFIED:20260401T000000Z");
    expect(calendar.endsWith("END:VCALENDAR")).toBe(true);
  });

  it("uses exclusive DTEND for all-day events in JST", () => {
    const calendar = toICalendar([
      {
        ...baseEvent,
        allDay: true,
        startAt: "2026-08-01T15:00:00.000Z", // JST 8/2
        endAt: "2026-08-03T15:00:00.000Z", // JST 8/4 (inclusive)
      },
    ]);

    expect(calendar).toContain("DTSTART;VALUE=DATE:20260802");
    expect(calendar).toContain("DTEND;VALUE=DATE:20260805");
  });
  it("supports timed events without an end time", () => {
    const calendar = toICalendar([
      {
        ...baseEvent,
        endAt: null,
      },
    ]);

    expect(calendar).toContain("DTSTART:20260410T090000Z");
    expect(calendar).not.toContain("DTEND:");
  });

  it("supports a single-day all-day event", () => {
    const calendar = toICalendar([
      {
        ...baseEvent,
        allDay: true,
        startAt: "2026-08-01T15:00:00.000Z",
        endAt: null,
      },
    ]);

    expect(calendar).toContain("DTSTART;VALUE=DATE:20260802");
    expect(calendar).toContain("DTEND;VALUE=DATE:20260803");
  });
});
