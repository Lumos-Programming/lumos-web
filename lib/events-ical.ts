import ical, { ICalCalendarMethod } from "ical-generator";
import { addDays, toJstDateKey } from "@/lib/events-format";
import type { LumosEvent } from "@/types/event";

const CALENDAR_NAME = "Lumos イベント";

function jstDateAsUtc(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function allDayEnd(event: LumosEvent): Date {
  // RFC 5545 の終日 DTEND は排他的。DB の endAt は最終日を含むため 1 日足す。
  const lastDay = toJstDateKey(event.endAt ?? event.startAt);
  return jstDateAsUtc(addDays(lastDay, 1));
}

function addEvent(
  calendar: ReturnType<typeof ical>,
  event: LumosEvent,
  generatedAt: Date,
) {
  const start = event.allDay
    ? jstDateAsUtc(toJstDateKey(event.startAt))
    : new Date(event.startAt);
  const end = event.allDay
    ? allDayEnd(event)
    : event.endAt
      ? new Date(event.endAt)
      : undefined;

  calendar.createEvent({
    id: `${event.id}@lumos-ynu.jp`,
    start,
    end,
    allDay: event.allDay,
    stamp: generatedAt,
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    lastModified: event.updatedAt ? new Date(event.updatedAt) : undefined,
  });
}

/** Lumos の公開イベントを RFC 5545 (iCalendar) 形式へ変換する。 */
export function toICalendar(
  events: LumosEvent[],
  generatedAt = new Date(),
): string {
  const calendar = ical({
    name: CALENDAR_NAME,
    method: ICalCalendarMethod.PUBLISH,
    prodId: { company: "Lumos", product: "Events Calendar", language: "JA" },
  });
  events.forEach((event) => addEvent(calendar, event, generatedAt));
  return calendar.toString();
}
