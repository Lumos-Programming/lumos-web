import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEventEditor } from "@/lib/event-auth";
import { getEvent } from "@/lib/events";
import {
  listSurveyResponses,
  parseSurveyBody,
  setEventSurvey,
} from "@/lib/survey";
import { summarizeSurvey } from "@/lib/survey-summary";
import {
  EVENT_API_RESPONSES,
  toEventErrorResponse,
} from "@/lib/events-response";
import { EVENT_ERROR_CODES, EventError } from "@/types/event";

type Params = { params: Promise<{ id: string }> };

/** 質問・回答一覧・集計 (運営のみ。回答は回答者と紐付いている) */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventEditor(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    const event = await getEvent(id);
    if (!event) throw new EventError(EVENT_ERROR_CODES.NOT_FOUND);
    const responses = await listSurveyResponses(id);
    return NextResponse.json({
      survey: event.survey,
      responses,
      summary: event.survey
        ? summarizeSurvey(event.survey.questions, responses)
        : [],
    });
  } catch (error) {
    return toEventErrorResponse(error, "Failed to get survey");
  }
}

/** 質問を保存する。{ survey: null } でアンケートを外す (運営のみ) */
export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return EVENT_API_RESPONSES.unauthorized();
  if (!isEventEditor(session)) return EVENT_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    await setEventSurvey(id, parseSurveyBody(body));
    return EVENT_API_RESPONSES.success();
  } catch (error) {
    return toEventErrorResponse(error, "Failed to save survey");
  }
}
