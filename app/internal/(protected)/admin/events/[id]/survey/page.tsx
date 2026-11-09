import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEvent } from "@/lib/events";
import { listAttendanceCandidates } from "@/lib/attendance";
import { candidateLabel } from "@/lib/attendance-filter";
import { isSurveyOpen, listSurveyResponses } from "@/lib/survey";
import { collectAnswerUsage } from "@/lib/survey-form";
import { summarizeSurvey } from "@/lib/survey-summary";
import { formatEventSchedule } from "@/lib/events-format";
import { PageHeader } from "@/components/page-header";
import { SurveyEditor } from "@/components/events/survey-editor";
import { SurveyResults } from "@/components/events/survey-results";

// 回答は随時増えるので、常に最新を出す
export const dynamic = "force-dynamic";

export default async function EventSurveyAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 権限は admin/layout.tsx が見ている
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const [responses, candidates] = await Promise.all([
    listSurveyResponses(id),
    listAttendanceCandidates(),
  ]);

  const usage = collectAnswerUsage(responses.map((r) => r.answers));
  const usedOptions: Record<string, string[]> = {};
  for (const q of event.survey?.questions ?? []) {
    if (q.type === "choice" && usage.has(q.id)) {
      usedOptions[q.id] = [...usage.get(q.id)!].map(String);
    }
  }
  const names = Object.fromEntries(
    candidates.map((c) => [c.id, candidateLabel(c)]),
  );
  const open = isSurveyOpen(event);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-spring-up space-y-8">
      <div>
        <Link
          href="/internal/admin/events"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          イベント管理へ戻る
        </Link>
        <PageHeader
          title={`アンケート: ${event.title}`}
          description={`${formatEventSchedule(event)}　参加予定などを事前に聞くアンケートです。回答はイベント開始時刻まで受け付け、回答しただけでは出席になりません (出席は当日に出席登録画面で入力します)。`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">質問</h2>
        <SurveyEditor
          eventId={id}
          initialSurvey={event.survey}
          answeredQuestionIds={[...usage.keys()]}
          usedOptions={usedOptions}
        />
      </section>

      {event.survey && (
        <section className="space-y-3">
          <h2 className="font-semibold">
            回答 ({responses.length} 人)
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {open ? "受付中" : "受付終了"}
            </span>
          </h2>
          <SurveyResults
            summary={summarizeSurvey(event.survey.questions, responses)}
            responseCount={responses.length}
            names={names}
          />
        </section>
      )}
    </div>
  );
}
