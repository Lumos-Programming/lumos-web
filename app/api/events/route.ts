import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEventEditor } from "@/lib/event-auth";
import { createEvent, listEventsInMonth, parseEventInput } from "@/lib/events";
import { isMonthKey, todayJstMonthKey } from "@/lib/events-format";
import {
  EVENT_API_RESPONSES,
  toEventErrorResponse,
} from "@/lib/events-response";

/** 月間のイベント一覧。?month=YYYY-MM (省略時は今月、日本時間) */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();

  const month =
    new URL(request.url).searchParams.get("month") ?? todayJstMonthKey();
  if (!isMonthKey(month)) return EVENT_API_RESPONSES.invalidMonth();

  try {
    return NextResponse.json(await listEventsInMonth(month));
  } catch (error) {
    return toEventErrorResponse(error, "Failed to list events");
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventEditor(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    const id = await createEvent(parseEventInput(body), session.user.id);
    return NextResponse.json({ id });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to create event");
  }
}
