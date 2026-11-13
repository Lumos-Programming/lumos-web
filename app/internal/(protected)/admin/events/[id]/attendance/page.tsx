import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEvent } from "@/lib/events";
import { listAttendanceCandidates, listAttendances } from "@/lib/attendance";
import { formatEventSchedule } from "@/lib/events-format";
import { PageHeader } from "@/components/page-header";
import { AttendanceManager } from "@/components/events/attendance-manager";

// 当日に複数の運営が同時に入力するので、常に最新を出す
export const dynamic = "force-dynamic";

export default async function EventAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 権限は admin/layout.tsx が見ている
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const [attendances, candidates] = await Promise.all([
    listAttendances(id),
    listAttendanceCandidates(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-spring-up">
      <Link
        href="/internal/admin/events"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="h-4 w-4" />
        イベント管理へ戻る
      </Link>
      <PageHeader
        title={`出席登録: ${event.title}`}
        description={`${formatEventSchedule(event)}　会場で参加を確認したメンバーにチェックを入れてください。飛び込み参加の人も検索して追加できます。`}
      />
      <AttendanceManager
        eventId={id}
        candidates={candidates}
        initialAttendeeIds={attendances.map((a) => a.memberId)}
      />
    </div>
  );
}
