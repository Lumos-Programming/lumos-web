import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authorizeAdminApi } from "@/lib/admin-api-auth";
import { createEvent, listEventsInMonth, parseEventInput } from "@/lib/events";
import { isMonthKey, todayJstKey } from "@/lib/events-format";
import { toEventErrorResponse } from "@/lib/events-response";

/** 月間のイベント一覧。?month=YYYY-MM (省略時は今月、日本時間) */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month =
    new URL(request.url).searchParams.get("month") ?? todayJstKey().slice(0, 7);
  if (!isMonthKey(month)) {
    return NextResponse.json(
      { error: "month は YYYY-MM 形式で指定してください" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await listEventsInMonth(month));
  } catch (error) {
    return toEventErrorResponse(error, "Failed to list events");
  }
}

export async function POST(request: Request) {
  const authorized = await authorizeAdminApi();
  if ("response" in authorized) return authorized.response;

  try {
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    const id = await createEvent(parseEventInput(body), authorized.userId);
    return NextResponse.json({ id });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to create event");
  }
}
