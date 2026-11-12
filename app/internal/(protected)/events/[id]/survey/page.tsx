import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getEvent } from "@/lib/events";
import { getSurveyResponse, isSurveyOpen } from "@/lib/survey";
import { formatEventSchedule } from "@/lib/events-format";
import { PageHeader } from "@/components/page-header";
import { SurveyAnswerForm } from "@/components/events/survey-answer-form";

// 締め切り (イベント開始) の判定があるので毎回読む
export const dynamic = "force-dynamic";

export default async function EventSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ログイン・退会済みの判定は (protected)/layout.tsx が見ている
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const event = await getEvent(id);
  if (!event?.survey) notFound();

  const response = await getSurveyResponse(id, session.user.id);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-spring-up">
      <Link
        href="/internal/events"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="h-4 w-4" />
        イベントへ戻る
      </Link>
      <PageHeader
        title={`アンケート: ${event.title}`}
        description={`${formatEventSchedule(event)}　回答はイベント開始まで何度でも修正できます。回答だけでは出席扱いにはならず、出席は当日に運営が確認します。`}
      />
      <SurveyAnswerForm
        eventId={id}
        questions={event.survey.questions}
        initialAnswers={response?.answers ?? null}
        closed={!isSurveyOpen(event)}
      />
    </div>
  );
}
