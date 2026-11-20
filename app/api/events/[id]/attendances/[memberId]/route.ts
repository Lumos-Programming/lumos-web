import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEventEditor } from "@/lib/event-auth";
import { parseMemberIdParam, removeAttendance } from "@/lib/attendance";
import {
  EVENT_API_RESPONSES,
  toEventErrorResponse,
} from "@/lib/events-response";

type Params = { params: Promise<{ id: string; memberId: string }> };

/** 出席記録を取り消す (運営のみ) */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventEditor(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id, memberId } = await params;
    const { removed } = await removeAttendance(
      id,
      parseMemberIdParam(memberId),
    );
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to remove attendance");
  }
}
