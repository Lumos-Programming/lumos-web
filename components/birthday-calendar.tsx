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
import { formatBirthDate, type JstToday } from "@/lib/date";

type BirthdayEntry = {
  id: string;
  name: string;
  nickname?: string;
  birthDate: string;
  avatarUrl?: string;
};

type YearMonth = { year: number; month: number };
type SelectedDay = YearMonth & { day: number };

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

// 常に4か月ぶん描画し、実際に何か月見せるかは CSS のブレークポイントで決める。
// JS でウィンドウ幅を見るとサーバー描画と食い違うため、表示制御は CSS に寄せる。
const MONTHS_RENDERED = 4;
const MONTH_VISIBILITY = [
  "",
  "hidden sm:block",
  "hidden lg:block",
  "hidden xl:block",
];

// MONTH_VISIBILITY と対応する Tailwind のブレークポイント。
// 実際に何か月見えているかは CSS が決めるので、めくり幅を合わせるには JS 側でも
// 同じ境界を知る必要がある。どちらかを変えたら両方直すこと。
const MONTH_BREAKPOINTS = [
  { minWidth: 1280, count: 4 }, // xl
  { minWidth: 1024, count: 3 }, // lg
  { minWidth: 640, count: 2 }, // sm
];

/**
 * 画面に見えている月数。描画中には呼ばず、クリックハンドラからのみ呼ぶこと。
 * 描画結果がウィンドウ幅に依存すると、サーバー描画と食い違ってしまう。
 */
function visibleMonthCount(): number {
  if (typeof window === "undefined") return 1;
  for (const bp of MONTH_BREAKPOINTS) {
    if (window.matchMedia(`(min-width: ${bp.minWidth}px)`).matches) {
      return bp.count;
    }
  }
  return 1;
}

function displayNameOf(entry: BirthdayEntry): string {
  return entry.nickname && entry.nickname !== entry.name
    ? entry.nickname
    : entry.name;
}

function MonthPanel({
  year,
  month,
  entries,
  today,
  onSelectDay,
}: {
  year: number;
  month: number;
  entries: BirthdayEntry[];
  today: JstToday;
  onSelectDay: (day: SelectedDay) => void;
}) {
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

  // 月曜始まりに揃える (Mon=0)
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isCurrentMonth = today.year === year && today.month === month;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-baseline justify-center gap-1.5 mb-2">
        <span
          className={`text-sm font-semibold ${isCurrentMonth ? "text-primary" : ""}`}
        >
          {MONTH_NAMES[month - 1]}
        </span>
        {month === 1 && (
          <span className="text-[10px] text-muted-foreground">{year}</span>
        )}
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className={`text-[10px] font-medium pb-1 ${
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

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const hasBirthday = byDay.has(day);
          const isToday = isCurrentMonth && day === today.day;
          return (
            <button
              key={day}
              disabled={!hasBirthday}
              onClick={() => onSelectDay({ year, month, day })}
              className={`
                flex items-center justify-center rounded aspect-square text-xs
                transition-colors
                ${isToday ? "bg-primary text-primary-foreground font-semibold" : ""}
                ${
                  hasBirthday && !isToday
                    ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20 cursor-pointer"
                    : ""
                }
                ${!hasBirthday && !isToday ? "text-muted-foreground/60" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BirthdayCalendar({
  entries,
  today,
}: {
  entries: BirthdayEntry[];
  today: JstToday;
}) {
  // 今月からの相対月数。年をまたぐ計算を絶対月インデックスで行うため、
  // 12月→1月で年が繰り上がるケースも自然に扱える。
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<SelectedDay | null>(null);

  const months: YearMonth[] = useMemo(() => {
    const base = today.year * 12 + (today.month - 1) + offset;
    return Array.from({ length: MONTHS_RENDERED }, (_, i) => {
      const abs = base + i;
      return { year: Math.floor(abs / 12), month: (abs % 12) + 1 };
    });
  }, [today.year, today.month, offset]);

  const selectedMembers = selected
    ? entries.filter((e) => {
        const [, mm, dd] = e.birthDate.split("-").map(Number);
        return mm === selected.month && dd === selected.day;
      })
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">カレンダー</h2>
        <div className="flex items-center gap-1">
          {offset !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setOffset(0)}
            >
              今月
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOffset((o) => o - visibleMonthCount())}
            aria-label="前へ"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOffset((o) => o + visibleMonthCount())}
            aria-label="次へ"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {months.map((m, i) => (
          <div key={`${m.year}-${m.month}`} className={MONTH_VISIBILITY[i]}>
            <MonthPanel
              year={m.year}
              month={m.month}
              entries={entries}
              today={today}
              onSelectDay={setSelected}
            />
          </div>
        ))}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selected &&
                `${MONTH_NAMES[selected.month - 1]}${selected.day}日の誕生日`}
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-3 pt-2">
            {selectedMembers.map((m) => {
              const display = displayNameOf(m);
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
