import {
  getDateParts,
  getJstToday,
  type ISODateParts,
  type ISODateString,
} from "@/lib/date";
import type { LumosEvent } from "@/types/event";

/**
 * イベントの日時まわりの純粋関数。サーバーとクライアントの両方から使う。
 *
 * イベントは日本時間で運用するので、ブラウザや Cloud Run のタイムゾーンに
 * 依存しないよう、日付の算出は `lib/date` の JST 固定の実装に寄せる。
 * "日付キー" は "YYYY-MM-DD" (`ISODateString`)、"月キー" は "YYYY-MM" (どちらも日本時間)。
 * 文字列の切り出しはせず、`getDateParts` で分解して `toDateKey` で組み立てる。
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

const pad2 = (n: number) => String(n).padStart(2, "0");

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

/** 年月日 → 日付キー。ここ以外で日付キーの文字列を組み立てない */
export function toDateKey({ year, month, day }: ISODateParts): ISODateString {
  return `${year}-${pad2(month)}-${pad2(day)}` as ISODateString;
}

/** 年月 → 月キー */
export function toMonthKey({
  year,
  month,
}: Pick<ISODateParts, "year" | "month">): string {
  return `${year}-${pad2(month)}`;
}

/** 日付キーを分解する。`ISODateString` は検証済みなので必ず取れる */
export function dateKeyParts(dateKey: ISODateString): ISODateParts {
  const parts = getDateParts(dateKey);
  if (!parts) throw new TypeError(`Invalid ISO date string: ${dateKey}`);
  return parts;
}

/** 月キーの 1 日の日付キー。月キーの分解もこれを経由して `getDateParts` に任せる */
export function monthFirstDay(monthKey: string): ISODateString {
  const parts = getDateParts(`${monthKey}-01`);
  if (!parts) throw new TypeError(`Invalid month key: ${monthKey}`);
  return toDateKey(parts);
}

/** 日付キーが属する月キー */
export function monthKeyOf(dateKey: ISODateString): string {
  return toMonthKey(dateKeyParts(dateKey));
}

/** ISO 日時 → 日本時間の "HH:mm" */
export function toJstTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Intl は 24 時を "24" と返すことがあるので 0 に寄せる
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${hour}:${get("minute")}`;
}

/** ISO 日時 → 日本時間の日付キー */
export function toJstDateKey(iso: string): ISODateString {
  return toDateKey(getJstToday(new Date(iso)));
}

/** ISO 日時 → 日本時間の月キー */
export function toJstMonthKey(iso: string): string {
  return toMonthKey(getJstToday(new Date(iso)));
}

/** ISO 日時 → datetime-local の値 ("YYYY-MM-DDTHH:mm"、日本時間) */
export function toJstDatetimeLocal(iso: string): string {
  return `${toJstDateKey(iso)}T${toJstTime(iso)}`;
}

const DATETIME_LOCAL_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?$/;

/**
 * datetime-local の値 ("YYYY-MM-DDTHH:mm") を日本時間として ISO にする。
 * 日付だけ ("YYYY-MM-DD") なら 0:00 とみなす。形式が違えば null。
 */
export function jstLocalToIso(local: string): string | null {
  const m = DATETIME_LOCAL_PATTERN.exec(local);
  if (!m) return null;
  const date = new Date(`${m[1]}T${m[2] ?? "00:00"}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** datetime-local の値の日付部分。形式が違えば null */
export function datetimeLocalToDateKey(local: string): ISODateString | null {
  const m = DATETIME_LOCAL_PATTERN.exec(local);
  const parts = m ? getDateParts(m[1]) : null;
  return parts ? toDateKey(parts) : null;
}

/** 日本時間で今日の日付キー */
export function todayJstDateKey(now: Date = new Date()): ISODateString {
  return toDateKey(getJstToday(now));
}

/** 日本時間で今月の月キー */
export function todayJstMonthKey(now: Date = new Date()): string {
  return toMonthKey(getJstToday(now));
}

/** 日付キーの日本時間 0:00 を ISO で返す */
export function dateKeyToIso(dateKey: ISODateString): string {
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString();
}

/** 月キーの 1 日 0:00 (日本時間) を ISO で返す */
export function monthStartIso(monthKey: string): string {
  return dateKeyToIso(monthFirstDay(monthKey));
}

/** 翌月キー / 前月キー */
export function shiftMonth(monthKey: string, delta: number): string {
  const { year, month } = dateKeyParts(monthFirstDay(monthKey));
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return toMonthKey({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
}

/** 日付キーを UTC の 0:00 として Date にする。曜日や日数の計算用 */
function dateKeyToUtc(dateKey: ISODateString): Date {
  const { year, month, day } = dateKeyParts(dateKey);
  return new Date(Date.UTC(year, month - 1, day));
}

/** 日付キーに日数を足す。タイムゾーンに依存しない純粋な日付演算 */
export function addDays(dateKey: ISODateString, days: number): ISODateString {
  const d = new Date(dateKeyToUtc(dateKey).getTime() + days * DAY_MS);
  return toDateKey({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

/** 日付キーの曜日 (0 = 日曜) */
export function weekdayOf(dateKey: ISODateString): number {
  return dateKeyToUtc(dateKey).getUTCDay();
}

/**
 * 月間カレンダーのマス目。日曜始まりで、前後の月のはみ出しも含めて
 * 7 の倍数の日付キーを返す。
 */
export function monthGridDays(monthKey: string): ISODateString[] {
  const first = monthFirstDay(monthKey);
  const start = addDays(first, -weekdayOf(first));
  const nextMonthFirst = monthFirstDay(shiftMonth(monthKey, 1));

  const days: ISODateString[] = [];
  for (let day = start; day < nextMonthFirst || days.length % 7 !== 0;) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

/** イベントがかかっている日付キーの範囲 (両端含む) */
export function eventDateRange(event: LumosEvent): {
  start: ISODateString;
  end: ISODateString;
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
export function eventCoversDate(
  event: LumosEvent,
  dateKey: ISODateString,
): boolean {
  const { start, end } = eventDateRange(event);
  return start <= dateKey && dateKey <= end;
}

/** 月キーに 1 日でもかかっているイベントだけ残す */
export function filterEventsInMonth(
  events: LumosEvent[],
  monthKey: string,
): LumosEvent[] {
  const first = monthFirstDay(monthKey);
  const last = addDays(monthFirstDay(shiftMonth(monthKey, 1)), -1);
  return events.filter((e) => {
    const { start, end } = eventDateRange(e);
    return start <= last && end >= first;
  });
}

/** "2026-09" → "2026年9月" */
export function formatMonthLabel(monthKey: string): string {
  const { year, month } = dateKeyParts(monthFirstDay(monthKey));
  return `${year}年${month}月`;
}

/** "2026-09-20" → "9月20日(土)"。withYear で年も付ける */
export function formatDateKey(
  dateKey: ISODateString,
  withYear = false,
): string {
  const { year, month, day } = dateKeyParts(dateKey);
  const wd = WEEKDAY_LABELS[weekdayOf(dateKey)];
  return `${withYear ? `${year}年` : ""}${month}月${day}日(${wd})`;
}

/**
 * 一覧に出す日時の表記。今年以外の開始日には年を付ける。
 *   終日 1 日:   "9月20日(土)"
 *   終日 複数日: "9月20日(土)〜22日(月)"
 *   時刻 同日:   "9月20日(土) 19:00〜21:00" / 終了なしなら "9月20日(土) 19:00〜"
 *   時刻 別日:   "9月20日(土) 22:00〜9月21日(日) 01:00"
 */
export function formatEventSchedule(
  event: LumosEvent,
  now: Date = new Date(),
): string {
  const startKey = toJstDateKey(event.startAt);
  // 今年でなければ年も付けて、去年の同月と取り違えないようにする
  const withYear = dateKeyParts(startKey).year !== getJstToday(now).year;
  if (event.allDay) {
    const { start, end } = eventDateRange(event);
    if (start === end) return formatDateKey(start, withYear);
    const endParts = dateKeyParts(end);
    const sameMonth = monthKeyOf(start) === monthKeyOf(end);
    const endLabel = sameMonth
      ? `${endParts.day}日(${WEEKDAY_LABELS[weekdayOf(end)]})`
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
