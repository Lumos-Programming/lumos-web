"use server";

import { requireMiniLtAdmin } from "@/lib/mini-lt/authorization";
import * as events from "@/lib/mini-lt/discord-events";

export async function createWeekEvent(weekId: string): Promise<void> {
  await requireMiniLtAdmin();
  await events.createWeekEvent(weekId);
}

export async function syncWeekEventDescription(weekId: string): Promise<void> {
  await requireMiniLtAdmin();
  await events.syncWeekEventDescription(weekId);
}

export async function deleteWeekEvent(weekId: string): Promise<void> {
  await requireMiniLtAdmin();
  await events.deleteWeekEvent(weekId);
}
