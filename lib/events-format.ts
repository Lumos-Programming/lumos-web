import type { CircleEvent } from "@/types/event";

/**
 * イベントの日時まわりの純粋関数。サーバーとクライアントの両方から使う。
 *
 * イベントは日本時間で運用するので、ブラウザや Cloud Run のタイムゾーンに
 * 依存しないよう、ここでは常に Asia/Tokyo を明示して変換する。
 * "日付キー" は "YYYY-MM-DD"、"月キー" は "YYYY-MM" (どちらも日本時間)。
 */

const TZ = "Asia/Tokyo";
const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAY_LABELS = [
  "日",
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
] as const;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

function jstParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    // Intl は 24 時を "24" と返すことがあるので 0 に寄せる
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

/** ISO 日時 → 日本時間の日付キー */
export function toJstDateKey(iso: string): string {
  const { year, month, day } = jstParts(new Date(iso));
  return `${year}-${month}-${day}`;
}

/** ISO 日時 → 日本時間の月キー */
export function toJstMonthKey(iso: string): string {
  return toJstDateKey(iso).slice(0, 7);
}

/** ISO 日時 → datetime-local の値 ("YYYY-MM-DDTHH:mm"、日本時間) */
export function toJstDatetimeLocal(iso: string): string {
  const { year, month, day, hour, minute } = jstParts(new Date(iso));
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** ISO 日時 → 日本時間の "HH:mm" */
export function toJstTime(iso: string): string {
  const { hour, minute } = jstParts(new Date(iso));
  return `${hour}:${minute}`;
}

/**
 * datetime-local の値 ("YYYY-MM-DDTHH:mm") を日本時間として ISO にする。
 * 日付だけ ("YYYY-MM-DD") なら 0:00 とみなす。形式が違えば null。
 */
export function jstLocalToIso(local: string): string | null {
  const m = local.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?$/);
  if (!m) return null;
  const date = new Date(`${m[1]}T${m[2] ?? "00:00"}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** 日本時間で今日の日付キー */
export function todayJstKey(now: Date = new Date()): string {
  return toJstDateKey(now.toISOString());
}

/** 日付キーの日本時間 0:00 を ISO で返す */
export function dateKeyToIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString();
}

/** 月キーの 1 日 0:00 (日本時間) を ISO で返す */
export function monthStartIso(monthKey: string): string {
  return dateKeyToIso(`${monthKey}-01`);
}

/** 翌月キー / 前月キー */
export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 日付キーに日数を足す。タイムゾーンに依存しない純粋な日付演算 */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return date.toISOString().slice(0, 10);
}

/** 日付キーの曜日 (0 = 日曜) */
export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * 月間カレンダーのマス目。日曜始まりで、前後の月のはみ出しも含めて
 * 7 の倍数の日付キーを返す。
 */
export function monthGridDays(monthKey: string): string[] {
  const first = `${monthKey}-01`;
  const start = addDays(first, -weekdayOf(first));
  const nextMonthFirst = `${shiftMonth(monthKey, 1)}-01`;

  const days: string[] = [];
  for (let day = start; day < nextMonthFirst || days.length % 7 !== 0;) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

/** イベントがかかっている日付キーの範囲 (両端含む) */
export function eventDateRange(event: CircleEvent): {
  start: string;
  end: string;
} {
  const start = toJstDateKey(event.startAt);
  if (!event.endAt) return { start, end: start };
  const end = toJstDateKey(event.endAt);
  // 時刻付きで 0:00 ちょうどに終わるものは前日までとみなす (22:00〜翌0:00 など)
  if (!event.allDay && end > start && toJstTime(event.endAt) === "00:00") {
    return { start, end: addDays(end, -1) };
  }
  return { start, end: end < start ? start : end };
}

/** イベントが指定の日付キーにかかっているか */
export function eventCoversDate(event: CircleEvent, dateKey: string): boolean {
  const { start, end } = eventDateRange(event);
  return start <= dateKey && dateKey <= end;
}

/** 月キーに 1 日でもかかっているイベントだけ残す */
export function filterEventsInMonth(
  events: CircleEvent[],
  monthKey: string,
): CircleEvent[] {
  const first = `${monthKey}-01`;
  const last = addDays(`${shiftMonth(monthKey, 1)}-01`, -1);
  return events.filter((e) => {
    const { start, end } = eventDateRange(e);
    return start <= last && end >= first;
  });
}

/** "2026-09" → "2026年9月" */
export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${y}年${m}月`;
}

/** "2026-09-20" → "9月20日(土)"。withYear で年も付ける */
export function formatDateKey(dateKey: string, withYear = false): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const wd = WEEKDAY_LABELS[weekdayOf(dateKey)];
  return `${withYear ? `${y}年` : ""}${m}月${d}日(${wd})`;
}

/**
 * 一覧に出す日時の表記。今年以外の開始日には年を付ける。
 *   終日 1 日:   "9月20日(土)"
 *   終日 複数日: "9月20日(土)〜22日(月)"
 *   時刻 同日:   "9月20日(土) 19:00〜21:00" / 終了なしなら "9月20日(土) 19:00〜"
 *   時刻 別日:   "9月20日(土) 22:00〜9月21日(日) 01:00"
 */
export function formatEventSchedule(
  event: CircleEvent,
  now: Date = new Date(),
): string {
  const startKey = toJstDateKey(event.startAt);
  // 今年でなければ年も付けて、去年の同月と取り違えないようにする
  const withYear = startKey.slice(0, 4) !== todayJstKey(now).slice(0, 4);
  if (event.allDay) {
    const { start, end } = eventDateRange(event);
    if (start === end) return formatDateKey(start, withYear);
    const sameMonth = start.slice(0, 7) === end.slice(0, 7);
    const endLabel = sameMonth
      ? `${Number(end.slice(8))}日(${WEEKDAY_LABELS[weekdayOf(end)]})`
      : formatDateKey(end);
    return `${formatDateKey(start, withYear)}〜${endLabel}`;
  }

  const startLabel = `${formatDateKey(startKey, withYear)} ${toJstTime(event.startAt)}`;
  if (!event.endAt) return `${startLabel}〜`;

  const endKey = toJstDateKey(event.endAt);
  const endTime = toJstTime(event.endAt);
  return endKey === startKey
    ? `${startLabel}〜${endTime}`
    : `${startLabel}〜${formatDateKey(endKey)} ${endTime}`;
}
