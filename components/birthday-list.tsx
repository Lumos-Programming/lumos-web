"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  formatBirthDate,
  daysUntilNextBirthday,
  type JstToday,
} from "@/lib/date";
import { BirthdayCalendar } from "@/components/birthday-calendar";

type BirthdayEntry = {
  id: string;
  name: string;
  nickname?: string;
  birthDate: string;
  avatarUrl?: string;
};

// 一覧に載せるのは直近のみ。それより先はカレンダーで辿る。
const UPCOMING_WITHIN_DAYS = 20;

function displayNameOf(entry: BirthdayEntry): string {
  return entry.nickname && entry.nickname !== entry.name
    ? entry.nickname
    : entry.name;
}

function MyBirthdayCountdown({
  birthDate,
  today,
}: {
  birthDate: string;
  today: JstToday;
}) {
  const days = daysUntilNextBirthday(birthDate, today);
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

export function BirthdayList({
  entries,
  myBirthDate,
  today,
}: {
  entries: BirthdayEntry[];
  myBirthDate?: string | null;
  today: JstToday;
}) {
  // 誕生日までの日数で昇順。同日どうしは元の並びを保つ。
  const upcoming = useMemo(
    () =>
      entries
        .map((entry) => ({
          entry,
          days: daysUntilNextBirthday(entry.birthDate, today),
        }))
        .filter(({ days }) => days <= UPCOMING_WITHIN_DAYS)
        .sort((a, b) => a.days - b.days),
    [entries, today],
  );

  return (
    <div className="space-y-8">
      {myBirthDate && (
        <MyBirthdayCountdown birthDate={myBirthDate} today={today} />
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          直近の誕生日
          <Badge variant="outline" className="text-xs font-normal">
            {upcoming.length} 件
          </Badge>
        </h2>

        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            近日中に誕生日のメンバーはいません。
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(({ entry, days }) => {
              const displayName = displayNameOf(entry);
              const isToday = days === 0;
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
                      <AvatarImage src={entry.avatarUrl} alt={displayName} />
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
                      {isToday ? (
                        <Badge className="bg-yellow-400 text-yellow-900 border-yellow-300 text-xs">
                          今日
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          あと {days} 日
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatBirthDate(entry.birthDate)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="pt-4 border-t">
        <BirthdayCalendar entries={entries} today={today} />
      </div>
    </div>
  );
}
