"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { candidateLabel, filterCandidates } from "@/lib/attendance-filter";
import type { AttendanceCandidate } from "@/types/event";

interface Props {
  eventId: string;
  candidates: AttendanceCandidate[];
  initialAttendeeIds: string[];
}

export function AttendanceManager({
  eventId,
  candidates,
  initialAttendeeIds,
}: Props) {
  const [attendeeIds, setAttendeeIds] = useState(
    () => new Set(initialAttendeeIds),
  );
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterCandidates(candidates, query),
    [candidates, query],
  );
  // 出席済みを上に出し、当日の確認漏れを見つけやすくする
  const attendees = filtered.filter((c) => attendeeIds.has(c.id));
  const others = filtered.filter((c) => !attendeeIds.has(c.id));

  const setIn = (
    setter: typeof setAttendeeIds,
    id: string,
    included: boolean,
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (included) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggle = async (member: AttendanceCandidate, attend: boolean) => {
    setError(null);
    setIn(setPending, member.id, true);
    // 楽観更新。失敗したら戻す
    setIn(setAttendeeIds, member.id, attend);
    try {
      const res = attend
        ? await fetch(`/api/events/${eventId}/attendances`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId: member.id }),
          })
        : await fetch(
            `/api/events/${eventId}/attendances/${encodeURIComponent(member.id)}`,
            { method: "DELETE" },
          );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "更新に失敗しました");
      }
    } catch (e) {
      setIn(setAttendeeIds, member.id, !attend);
      setError(
        `${candidateLabel(member)}: ${e instanceof Error ? e.message : "更新に失敗しました"}`,
      );
    } finally {
      setIn(setPending, member.id, false);
    }
  };

  const row = (member: AttendanceCandidate) => {
    const checked = attendeeIds.has(member.id);
    const label = candidateLabel(member);
    const sub = [member.nickname, member.discordUsername]
      .filter((v) => v && v !== label)
      .join(" / ");
    return (
      <li key={member.id}>
        <label className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted cursor-pointer">
          <Checkbox
            checked={checked}
            disabled={pending.has(member.id)}
            onCheckedChange={(v) => toggle(member, v === true)}
            aria-label={`${label} の出席`}
          />
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.avatar} alt="" />
            <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="flex flex-col min-w-0">
            <span className="truncate">{label}</span>
            {sub && (
              <span className="text-xs text-muted-foreground truncate">
                {sub}
              </span>
            )}
          </span>
        </label>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・ニックネーム・Discord 名で検索"
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          出席 {attendeeIds.size} 人
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {attendees.length > 0 && (
        <section className="space-y-1">
          <h2 className="text-sm font-semibold">出席済み</h2>
          <ul>{attendees.map(row)}</ul>
        </section>
      )}
      <section className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground">
          メンバー
        </h2>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground px-3">
            該当するメンバーがいません
          </p>
        ) : (
          <ul>{others.map(row)}</ul>
        )}
      </section>
    </div>
  );
}
