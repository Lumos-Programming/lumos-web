import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEventEditor } from "@/lib/event-auth";
import {
  listAttendances,
  parseAttendanceBody,
  recordAttendance,
} from "@/lib/attendance";
import {
  EVENT_API_RESPONSES,
  toEventErrorResponse,
} from "@/lib/events-response";

type Params = { params: Promise<{ id: string }> };

/** 出席者一覧 (運営のみ) */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventEditor(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    return NextResponse.json({ attendances: await listAttendances(id) });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to list attendances");
  }
}

/** 出席を登録する (運営が会場で確認して入力する) */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventEditor(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const memberId = parseAttendanceBody(body);
    const { created } = await recordAttendance(id, memberId, session.user.id);
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to record attendance");
  }
}
