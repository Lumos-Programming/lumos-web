"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  WEEKDAY_LABELS,
  eventCoversDate,
  formatDateKey,
  formatMonthLabel,
  monthGridDays,
  shiftMonth,
  toJstDateKey,
  toJstTime,
  weekdayOf,
} from "@/lib/events-format";
import type { CircleEvent } from "@/types/event";
import { EVENT_SOURCE_STYLES, EventItem } from "@/components/events/event-item";

/** マスに並べるチップの上限。それ以上は "+N" にまとめる */
const MAX_CHIPS = 3;

interface EventCalendarProps {
  /** 表示する月 ("YYYY-MM"、日本時間) */
  month: string;
  /** その月にかかっているイベント (開始順) */
  events: CircleEvent[];
  /** 日本時間の今日。SSR と CSR でずれないようサーバーから渡す */
  today: string;
}

/**
 * 月間カレンダー。月の移動は ?m= のリンクで行い、データはサーバーが月ごとに取る。
 * 日付を選ぶとその日の一覧に絞り込み、もう一度押すと月全体に戻る。
 */
export function EventCalendar({ month, events, today }: EventCalendarProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = useMemo(() => monthGridDays(month), [month]);
  const thisMonth = today.slice(0, 7);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CircleEvent[]>();
    for (const day of days) {
      map.set(
        day,
        events.filter((e) => eventCoversDate(e, day)),
      );
    }
    return map;
  }, [days, events]);

  const listed = selected ? (eventsByDay.get(selected) ?? []) : events;

  const toggleDay = (day: string) =>
    setSelected((prev) => (prev === day ? null : day));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-gradient-card">
          <Button asChild variant="ghost" size="icon" aria-label="前の月">
            <Link href={`?m=${shiftMonth(month, -1)}`} scroll={false}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tabular-nums">
              {formatMonthLabel(month)}
            </h2>
            {month !== thisMonth && (
              <Button asChild variant="outline" size="sm">
                <Link href={`?m=${thisMonth}`} scroll={false}>
                  今月
                </Link>
              </Button>
            )}
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="次の月">
            <Link href={`?m=${shiftMonth(month, 1)}`} scroll={false}>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "py-2",
                i === 0 && "text-red-500",
                i === 6 && "text-blue-500",
              )}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = day.startsWith(month);
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = day === today;
            const isSelected = day === selected;
            const wd = weekdayOf(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={isSelected}
                aria-label={`${formatDateKey(day, true)} ${dayEvents.length}件`}
                className={cn(
                  "relative flex flex-col items-stretch gap-1 border-b border-r p-1 text-left min-h-[3.5rem] sm:min-h-[5.5rem] transition-colors",
                  "[&:nth-child(7n)]:border-r-0",
                  inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground",
                  isSelected
                    ? "bg-purple-50 dark:bg-purple-950/40 ring-2 ring-inset ring-purple-400"
                    : "hover:bg-purple-50/60 dark:hover:bg-purple-950/20 focus-visible:bg-purple-50/60",
                  "focus-visible:outline-none",
                )}
              >
                <span
                  className={cn(
                    "self-start inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday &&
                      "bg-gradient-primary text-white font-bold shadow-sm",
                    !isToday && inMonth && wd === 0 && "text-red-500",
                    !isToday && inMonth && wd === 6 && "text-blue-500",
                  )}
                >
                  {Number(day.slice(8))}
                </span>

                {/* スマホは点、それ以上はタイトル入りのチップ */}
                {dayEvents.length > 0 && (
                  <>
                    <div className="flex gap-0.5 flex-wrap sm:hidden px-0.5">
                      {dayEvents.slice(0, 4).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            EVENT_SOURCE_STYLES[e.source].dot,
                          )}
                        />
                      ))}
                    </div>
                    <div className="hidden sm:flex flex-col gap-0.5">
                      {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                        <span
                          key={e.id}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-[11px] leading-4 font-medium",
                            EVENT_SOURCE_STYLES[e.source].chip,
                          )}
                        >
                          {!e.allDay && toJstDateKey(e.startAt) === day && (
                            <span className="hidden md:inline tabular-nums opacity-80 mr-1">
                              {toJstTime(e.startAt)}
                            </span>
                          )}
                          {e.title}
                        </span>
                      ))}
                      {dayEvents.length > MAX_CHIPS && (
                        <span className="px-1.5 text-[11px] text-muted-foreground">
                          +{dayEvents.length - MAX_CHIPS}件
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            {selected
              ? `${formatDateKey(selected, true)} のイベント`
              : `${formatMonthLabel(month)} のイベント`}
          </h3>
          {selected && (
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              月全体を見る
            </Button>
          )}
        </div>
        {listed.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                {selected
                  ? "この日のイベントはありません"
                  : "この月のイベントはありません"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {listed.map((event) => (
              <EventItem
                key={event.id}
                event={event}
                past={toJstDateKey(event.endAt ?? event.startAt) < today}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
