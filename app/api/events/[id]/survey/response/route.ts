import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEventParticipant } from "@/lib/event-auth";
import {
  getSurveyResponse,
  parseSurveyAnswerBody,
  submitSurveyResponse,
} from "@/lib/survey";
import {
  EVENT_API_RESPONSES,
  toEventErrorResponse,
} from "@/lib/events-response";

type Params = { params: Promise<{ id: string }> };

/** 自分の回答 (未回答なら response: null) */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventParticipant(session)) return EVENT_API_RESPONSES.optedOut();

  try {
    const { id } = await params;
    return NextResponse.json({
      response: await getSurveyResponse(id, session.user.id),
    });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to get survey response");
  }
}

/** 自分の回答を保存する。イベント開始までは何度でも上書きできる */
export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventParticipant(session)) return EVENT_API_RESPONSES.optedOut();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const answers = parseSurveyAnswerBody(body);
    const { created } = await submitSurveyResponse(
      id,
      session.user.id,
      answers,
    );
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to save survey response");
  }
}
