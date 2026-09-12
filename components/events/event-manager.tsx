"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventItem } from "@/components/events/event-item";
import {
  jstLocalToIso,
  todayJstKey,
  toJstDateKey,
  toJstDatetimeLocal,
} from "@/lib/events-format";
import { byStartAtAsc, type CircleEvent } from "@/types/event";

/**
 * フォームの値。日時は datetime-local / date の文字列のまま持ち、
 * 送信時に日本時間として ISO に変換する。
 */
type EventFormValues = {
  title: string;
  allDay: boolean;
  /** 時刻あり: "YYYY-MM-DDTHH:mm" / 終日: "YYYY-MM-DD" */
  start: string;
  /** 空なら終了なし */
  end: string;
  location: string;
  description: string;
};

const EMPTY_FORM: EventFormValues = {
  title: "",
  allDay: false,
  start: "",
  end: "",
  location: "",
  description: "",
};

function toFormValues(event: CircleEvent): EventFormValues {
  const toLocal = (iso: string) =>
    event.allDay ? toJstDateKey(iso) : toJstDatetimeLocal(iso);
  return {
    title: event.title,
    allDay: event.allDay,
    start: toLocal(event.startAt),
    end: event.endAt ? toLocal(event.endAt) : "",
    location: event.location,
    description: event.description,
  };
}

/** 終日の切り替えで、入力済みの日付を捨てずに形式だけ変える */
function switchAllDay(value: string, allDay: boolean): string {
  if (!value) return value;
  if (allDay) return value.slice(0, 10);
  return value.length === 10 ? `${value}T19:00` : value;
}

interface EventManagerProps {
  /** サーバーで取得した一覧 (開始順)。以降の増減はこのコンポーネントが持つ */
  initialEvents: CircleEvent[];
}

export function EventManager({ initialEvents }: EventManagerProps) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayJstKey();
  const upcoming = events.filter(
    (e) => toJstDateKey(e.endAt ?? e.startAt) >= today,
  );
  const past = events
    .filter((e) => toJstDateKey(e.endAt ?? e.startAt) < today)
    .reverse();

  const startEdit = (event: CircleEvent) => {
    setEditingId(event.id);
    setForm(toFormValues(event));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const update = <K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const startAt = jstLocalToIso(form.start);
    if (!form.title.trim() || !startAt) {
      setError("タイトルと開始日時を入力してください");
      return;
    }
    const endAt = form.end ? jstLocalToIso(form.end) : null;
    if (form.end && !endAt) {
      setError("終了日時の形式が正しくありません");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      startAt,
      endAt,
      allDay: form.allDay,
      location: form.location,
    };

    setSubmitting(true);
    try {
      const res = await fetch(
        editingId ? `/api/events/${editingId}` : "/api/events",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      // エラー時にサーバーが JSON を返さないことがあるので、パース失敗も握る
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "保存に失敗しました");
        return;
      }

      const saved: CircleEvent = editingId
        ? { ...events.find((ev) => ev.id === editingId)!, ...payload }
        : {
            ...payload,
            id: data.id,
            source: "manual",
            sourceRef: null,
            createdBy: "",
            createdAt: null,
            updatedAt: null,
          };
      setEvents((prev) =>
        [...prev.filter((ev) => ev.id !== saved.id), saved].sort(byStartAtAsc),
      );
      cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (event: CircleEvent) => {
    if (!confirm(`「${event.title}」を削除しますか？`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "削除に失敗しました");
        return;
      }
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
      if (editingId === event.id) cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    }
  };

  const inputType = form.allDay ? "date" : "datetime-local";
  const actionsFor = (event: CircleEvent) => (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="編集"
        onClick={() => startEdit(event)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="削除"
        className="text-destructive hover:text-destructive"
        onClick={() => handleDelete(event)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="bg-gradient-card">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              {editingId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "イベントを編集" : "イベントを追加"}
            </span>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">タイトル</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="例: 新歓ハッカソン"
                maxLength={100}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="event-all-day"
                checked={form.allDay}
                onCheckedChange={(checked) => {
                  const allDay = checked === true;
                  setForm((prev) => ({
                    ...prev,
                    allDay,
                    start: switchAllDay(prev.start, allDay),
                    end: switchAllDay(prev.end, allDay),
                  }));
                }}
              />
              <Label htmlFor="event-all-day" className="font-normal">
                終日 (時刻を指定しない)
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">
                  {form.allDay ? "開始日" : "開始日時"}
                </Label>
                <Input
                  id="event-start"
                  type={inputType}
                  value={form.start}
                  onChange={(e) => update("start", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">
                  {form.allDay ? "終了日 (任意)" : "終了日時 (任意)"}
                </Label>
                <Input
                  id="event-end"
                  type={inputType}
                  value={form.end}
                  min={form.start || undefined}
                  onChange={(e) => update("end", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">場所 (任意)</Label>
              <Input
                id="event-location"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="例: 理工学部講義棟A / Discord"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">説明 (任意)</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="持ち物や参加方法など"
                rows={4}
                maxLength={2000}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  キャンセル
                </Button>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : editingId ? "更新する" : "追加する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold">
          これからのイベント ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            予定されているイベントはありません
          </p>
        ) : (
          upcoming.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              actions={actionsFor(event)}
            />
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">
            過去のイベント ({past.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            1 年より前のものはここに出ません。
          </p>
          {past.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              past
              actions={actionsFor(event)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
