import Link from "next/link";
import { Settings2 } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { listEventsInMonth, listUpcomingEvents } from "@/lib/events";
import { isMonthKey, todayJstKey } from "@/lib/events-format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventCalendar } from "@/components/events/event-calendar";
import { EventItem } from "@/components/events/event-item";

// イベントは運営がいつでも追加するので、リクエストごとに Firestore を読む
export const dynamic = "force-dynamic";

const UPCOMING_LIMIT = 5;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const today = todayJstKey();
  // 不正な月指定は黙って今月に倒す (URL を手で書き換えた場合)
  const month = m && isMonthKey(m) ? m : today.slice(0, 7);

  const [monthEvents, upcoming, admin] = await Promise.all([
    listEventsInMonth(month),
    listUpcomingEvents(UPCOMING_LIMIT),
    isAdmin(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-spring-up">
      <PageHeader
        title="イベント"
        description="サークル内のイベント予定です。"
        actions={
          admin ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/internal/admin/events">
                <Settings2 className="h-4 w-4" />
                イベントを管理
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* 月が変わったら日付の選択状態を持ち越さない */}
        <EventCalendar
          key={month}
          month={month}
          events={monthEvents}
          today={today}
        />

        <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <h2 className="font-semibold">これからの予定</h2>
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                予定されているイベントはまだありません
              </CardContent>
            </Card>
          ) : (
            upcoming.map((event) => <EventItem key={event.id} event={event} />)
          )}
        </aside>
      </div>
    </div>
  );
}
