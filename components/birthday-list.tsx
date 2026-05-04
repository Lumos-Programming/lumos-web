"use client";

import { useMemo, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatBirthDate } from "@/lib/date";
import { sendBirthdayJokeDm } from "@/lib/birthday/actions";
import { BirthdayYearCalendar } from "@/components/birthday-year-calendar";

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

const GEEK_JOKES = [
  {
    label: "age++",
    message:
      "age++ を実行しました。コンパイルエラー: 0件。テスト: all passed。",
  },
  {
    label: "git tag",
    message:
      "git tag -a birthday-$(date +%Y) -m 'Happy Birthday! No breaking changes detected in this release.'",
  },
  {
    label: "console.log",
    message:
      'console.log("Happy Birthday! Stack usage: optimal. Memory leaks: none. Uptime: 1 year+.");',
  },
  {
    label: "deploy",
    message:
      "本番環境へのデプロイが完了しました。ロールバック: 不要。ステータス: healthy。今年もよろしくお願いします。",
  },
];

function daysUntilNextBirthday(birthDate: string): number {
  const now = new Date();
  const [, m, d] = birthDate.split("-").map(Number);
  const next = new Date(now.getFullYear(), m - 1, d);
  if (
    next.getMonth() < now.getMonth() ||
    (next.getMonth() === now.getMonth() && next.getDate() < now.getDate())
  ) {
    next.setFullYear(now.getFullYear() + 1);
  }
  const diff =
    next.getTime() -
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function MyBirthdayCountdown({ birthDate }: { birthDate: string }) {
  const days = daysUntilNextBirthday(birthDate);
  if (days === 0) return null;

  return (
    <div className="mb-6 rounded-xl border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4">
      <p className="text-sm text-muted-foreground">あなたの誕生日まで</p>
      <p className="text-3xl font-bold text-primary mt-0.5">あと {days} 日</p>
      <p className="text-xs text-muted-foreground mt-1">
        {formatBirthDate(birthDate)}
      </p>
    </div>
  );
}

function JokeButtons({ discordId, name }: { discordId: string; name: string }) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSend(joke: (typeof GEEK_JOKES)[number]) {
    if (isPending) return;
    setSending(joke.label);
    startTransition(async () => {
      const result = await sendBirthdayJokeDm(discordId, name, joke.message);
      setSending(null);
      if (result.success) {
        setSent((prev) => new Set(prev).add(joke.label));
        toast({
          title: "Discord DM を送信しました",
          description: `${name}さんに「${joke.label}」を届けました`,
        });
      } else {
        toast({
          title: "送信に失敗しました",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2">
        Discord DM でジョークを送る
      </p>
      <div className="flex flex-wrap gap-2">
        {GEEK_JOKES.map((j) => {
          const isSending = sending === j.label;
          const isSent = sent.has(j.label);
          return (
            <Button
              key={j.label}
              variant={isSent ? "secondary" : "outline"}
              size="sm"
              className="text-xs h-7"
              disabled={isPending}
              onClick={() => handleSend(j)}
            >
              {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {isSent ? `${j.label} ✓` : j.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function BirthdayList({
  entries,
  myBirthDate,
}: {
  entries: BirthdayEntry[];
  myBirthDate?: string | null;
}) {
  const now = new Date();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();

  const grouped = useMemo(() => {
    const map = new Map<number, BirthdayEntry[]>();
    for (const entry of entries) {
      const month = parseInt(entry.birthDate.split("-")[1]);
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(entry);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          parseInt(a.birthDate.split("-")[2]) -
          parseInt(b.birthDate.split("-")[2]),
      );
    }
    const months: number[] = [];
    for (let i = 0; i < 12; i++) {
      const m = ((todayMonth - 1 + i) % 12) + 1;
      if (map.has(m)) months.push(m);
    }
    return months.map((m) => ({ month: m, entries: map.get(m)! }));
  }, [entries, todayMonth]);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        誕生日を公開しているメンバーがいません。
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {myBirthDate && <MyBirthdayCountdown birthDate={myBirthDate} />}

      <div className="space-y-8">
        {grouped.map(({ month, entries: monthEntries }) => {
          const isCurrentMonth = month === todayMonth;
          return (
            <section key={month}>
              <h2
                className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                  isCurrentMonth ? "text-primary" : ""
                }`}
              >
                {MONTH_NAMES[month - 1]}
                {isCurrentMonth && (
                  <Badge variant="outline" className="text-xs font-normal">
                    今月
                  </Badge>
                )}
              </h2>
              <ul className="space-y-2">
                {monthEntries.map((entry) => {
                  const displayName =
                    entry.nickname && entry.nickname !== entry.name
                      ? entry.nickname
                      : entry.name;
                  const isToday =
                    month === todayMonth &&
                    parseInt(entry.birthDate.split("-")[2]) === todayDay;
                  return (
                    <li
                      key={entry.id}
                      className={`p-3 rounded-lg border ${
                        isToday
                          ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage
                            src={entry.avatarUrl}
                            alt={displayName}
                          />
                          <AvatarFallback className="text-sm">
                            {displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {displayName}
                          </p>
                          {entry.nickname && entry.nickname !== entry.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {entry.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isToday && (
                            <Badge className="bg-yellow-400 text-yellow-900 border-yellow-300 text-xs">
                              今日
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatBirthDate(entry.birthDate)}
                          </span>
                        </div>
                      </div>
                      {isToday && (
                        <JokeButtons discordId={entry.id} name={displayName} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="pt-4 border-t">
        <BirthdayYearCalendar entries={entries} />
      </div>
    </div>
  );
}
