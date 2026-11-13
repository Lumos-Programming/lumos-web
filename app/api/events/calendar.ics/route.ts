import { toICalendar } from "@/lib/events-ical";
import { listEventsForCalendar } from "@/lib/events";

// 更新されたイベントを購読クライアントが取り直せるよう、常に最新の Firestore を読む。
export const dynamic = "force-dynamic";

/** 認証不要の Lumos 公開イベントカレンダー (RFC 5545 / iCalendar)。 */
export async function GET() {
  const calendar = toICalendar(await listEventsForCalendar());

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lumos-events.ics"',
      // Google Calendar 等の定期取得の負荷を抑えつつ、変更は最大 5 分で反映させる。
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
