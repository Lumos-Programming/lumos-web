import { listEventsForAdmin } from "@/lib/events";
import { PageHeader } from "@/components/page-header";
import { EventManager } from "@/components/events/event-manager";

// 管理画面は常に最新の状態を見せる
export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  // 権限は admin/layout.tsx が見ている
  const events = await listEventsForAdmin();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-spring-up">
      <PageHeader
        title="イベント管理"
        description="サークル内イベントを登録します。登録したものはメンバーのイベントカレンダーに出ます。"
      />
      <EventManager initialEvents={events} />
    </div>
  );
}
