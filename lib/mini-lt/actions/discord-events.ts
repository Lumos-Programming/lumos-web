"use server";

import { requireMiniLtAdmin } from "@/lib/mini-lt/authorization";
import * as events from "@/lib/mini-lt/discord-events";
import { syncMiniLtCalendarEvent } from "@/lib/mini-lt/calendar-event";

/** Discord 側の操作は済んでいるので、カレンダーの反映に失敗しても落とさない */
async function syncCalendar(weekId: string): Promise<void> {
  try {
    await syncMiniLtCalendarEvent(weekId);
  } catch (error) {
    console.error("Failed to sync mini LT calendar event:", error);
  }
}

export async function createWeekEvent(weekId: string): Promise<void> {
  await requireMiniLtAdmin();
  await events.createWeekEvent(weekId);
  await syncCalendar(weekId);
}

export async function syncWeekEventDescription(weekId: string): Promise<void> {
  await requireMiniLtAdmin();
  await events.syncWeekEventDescription(weekId);
  await syncCalendar(weekId);
}

export async function deleteWeekEvent(weekId: string): Promise<void> {
  await requireMiniLtAdmin();
  await events.deleteWeekEvent(weekId);
}
