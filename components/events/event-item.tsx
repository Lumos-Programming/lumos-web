import { CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatEventSchedule } from "@/lib/events-format";
import type { CircleEvent } from "@/types/event";

/** 出どころごとの色。mini-LT からの取り込みは差し色のオレンジで見分ける */
export const EVENT_SOURCE_STYLES: Record<
  CircleEvent["source"],
  { label: string; chip: string; dot: string }
> = {
  manual: {
    label: "サークル",
    chip: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
    dot: "bg-purple-500",
  },
  "mini-lt": {
    label: "mini LT",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    dot: "bg-orange-500",
  },
};

interface EventItemProps {
  event: CircleEvent;
  /** 過去のイベントを薄く出す */
  past?: boolean;
  /** 右側に置く操作ボタンなど */
  actions?: React.ReactNode;
  className?: string;
}

/** イベント 1 件のカード。カレンダーの日別一覧・これからの予定・管理画面で共通 */
export function EventItem({ event, past, actions, className }: EventItemProps) {
  const source = EVENT_SOURCE_STYLES[event.source];
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800",
        past && "opacity-60",
        className,
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground break-words">
                {event.title}
              </h3>
              {event.source !== "manual" && (
                <Badge
                  variant="outline"
                  className={cn("border-0", source.chip)}
                >
                  {source.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                {formatEventSchedule(event)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {event.location}
                </span>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                {event.description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-1 shrink-0">{actions}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
