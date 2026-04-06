import { PageHeader } from "@/components/page-header";
import EventList from "@/components/event-list";

export default function EventsPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto animate-spring-up">
      <PageHeader title="イベント一覧" />
      <EventList />
    </div>
  );
}
