"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatBirthDate } from "@/lib/date";

type BirthdayEntry = {
  id: string;
  name: string;
  nickname?: string;
  birthDate: string;
  avatarUrl?: string;
};

const MONTH_NAMES = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];
const WEEK_DAYS = ["月", "火", "水", "木", "金", "土", "日"];

export function BirthdayYearCalendar({
  entries,
}: {
  entries: BirthdayEntry[];
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const [month, setMonth] = useState(todayMonth); // 1-12
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const prev = () => setMonth((m) => (m === 1 ? 12 : m - 1));
  const next = () => setMonth((m) => (m === 12 ? 1 : m + 1));

  // 月 → 日 → エントリ のマップ
  const byDay = useMemo(() => {
    const map = new Map<number, BirthdayEntry[]>();
    for (const entry of entries) {
      const [, mm, dd] = entry.birthDate.split("-").map(Number);
      if (mm !== month) continue;
      if (!map.has(dd)) map.set(dd, []);
      map.get(dd)!.push(entry);
    }
    return map;
  }, [entries, month]);

  // 月曜始まり: 1日の曜日オフセット (Mon=0)
  const firstDayOfWeek = (new Date(currentYear, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedMembers = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">年間カレンダー</h2>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* ヘッダー: 前月 / 月名 / 次月 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            aria-label="前の月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg">
            {MONTH_NAMES[month - 1]}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            aria-label="次の月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center">
          {WEEK_DAYS.map((d, i) => (
            <div
              key={d}
              className={`text-xs font-medium py-1 ${
                i === 5
                  ? "text-blue-500"
                  : i === 6
                    ? "text-red-500"
                    : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const hasBirthday = byDay.has(day);
            const isToday = month === todayMonth && day === todayDay;
            return (
              <button
                key={day}
                disabled={!hasBirthday}
                onClick={() => {
                  if (hasBirthday) setSelectedDay(day);
                }}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg
                  aspect-square text-sm font-medium transition-colors
                  ${isToday ? "bg-primary text-primary-foreground" : ""}
                  ${
                    hasBirthday && !isToday
                      ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                      : ""
                  }
                  ${!hasBirthday && !isToday ? "text-muted-foreground cursor-default" : ""}
                `}
              >
                {day}
                {hasBirthday && (
                  <span
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full
                      ${isToday ? "bg-primary-foreground" : "bg-primary"}
                    `}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 今月の誕生日サマリー */}
        {byDay.size > 0 && (
          <div className="border-t pt-3 space-y-1">
            {[...byDay.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([day, members]) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="w-full flex items-center gap-2 text-left rounded-md px-2 py-1 hover:bg-muted transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-8 shrink-0">
                    {day}日
                  </span>
                  <div className="flex -space-x-1.5">
                    {members.slice(0, 4).map((m) => {
                      const display =
                        m.nickname && m.nickname !== m.name
                          ? m.nickname
                          : m.name;
                      return (
                        <Avatar
                          key={m.id}
                          className="h-5 w-5 border border-background shrink-0"
                        >
                          <AvatarImage src={m.avatarUrl} alt={display} />
                          <AvatarFallback className="text-[8px]">
                            {display.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                    {members.length > 4 && (
                      <span className="text-[10px] text-muted-foreground ml-2">
                        +{members.length - 4}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">
                    {members
                      .map((m) =>
                        m.nickname && m.nickname !== m.name
                          ? m.nickname
                          : m.name,
                      )
                      .join("・")}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* 誕生日ポップアップ */}
      <Dialog
        open={selectedDay !== null}
        onOpenChange={(o) => !o && setSelectedDay(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {MONTH_NAMES[month - 1]}
              {selectedDay}日の誕生日
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-3 pt-2">
            {selectedMembers.map((m) => {
              const display =
                m.nickname && m.nickname !== m.name ? m.nickname : m.name;
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={m.avatarUrl} alt={display} />
                    <AvatarFallback>{display.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{display}</p>
                    {m.nickname && m.nickname !== m.name && (
                      <p className="text-xs text-muted-foreground">{m.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatBirthDate(m.birthDate)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
