import { format, addWeeks, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function getWeekId(date: Date = new Date()): string {
  // ISOWeek format: 2026-W09
  return format(date, "RRRR-'W'II");
}

export function getRelativeWeekId(
  offset: number,
  from: Date = new Date(),
): string {
  const date = addWeeks(from, offset);
  return getWeekId(date);
}

export function getWeekDateFromWeekId(weekId: string): Date {
  // weekId format: "2026-W09"
  const [year, week] = weekId.split("-W");
  // ISO week date format: 2026-W09-1 (Monday)
  const isoDate = `${year}-W${week.padStart(2, "0")}-1`;
  return parseISO(isoDate);
}

export function formatWeekDate(weekId: string): string {
  try {
    const monday = getWeekDateFromWeekId(weekId);
    return format(monday, "M月d日(E)", { locale: ja });
  } catch {
    return weekId;
  }
}

// weekId format: "2026-W09" (ISO week 01-53)
const WEEK_ID_PATTERN = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

// URLの ?week= など外部から渡された値が weekId として使えるか検証する
export function isValidWeekId(weekId: string | undefined): weekId is string {
  if (!weekId || !WEEK_ID_PATTERN.test(weekId)) return false;
  const monday = getWeekDateFromWeekId(weekId);
  if (Number.isNaN(monday.getTime())) return false;
  // その年に存在しない週(例: 2021-W53)を弾くため往復で一致するか確認する
  return getWeekId(monday) === weekId;
}

// 不正な weekId は次回イベント週にフォールバックさせる
export function resolveWeekId(
  weekId: string | undefined,
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): string {
  return isValidWeekId(weekId) ? weekId : getNextEventWeekId(now, config);
}

// "2026-W12" -> "2026 / W12"
export function formatWeekIsoLabel(weekId: string): string {
  if (!isValidWeekId(weekId)) return weekId;
  const [year, week] = weekId.split("-W");
  return `${year} / W${week}`;
}

// Event configuration type
export type EventConfig = {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: number; // 0-23
  endHour: number; // 1-24 (exclusive)
};

// Event configuration - easy to modify when event schedule changes
export const EVENT_CONFIG: EventConfig = {
  dayOfWeek: 1, // Monday
  startHour: 21, // 21:00
  endHour: 24, // 24:00 (midnight, exclusive)
};

// Check if currently during event time
export function isDuringEvent(
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): boolean {
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  return (
    dayOfWeek === config.dayOfWeek &&
    hour >= config.startHour &&
    hour < config.endHour
  );
}

export enum EventState {
  Upcoming = "upcoming",
  Ongoing = "ongoing",
  Past = "past",
}

export function getThisWeekEventState(
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): EventState {
  if (config.dayOfWeek > now.getDay()) return EventState.Upcoming;
  if (config.dayOfWeek === now.getDay())
    return isDuringEvent(now, config)
      ? EventState.Ongoing
      : EventState.Upcoming;
  return EventState.Past;
}

// Get week IDs for navigation (prev, center, next)
export function getNavigationWeeks(
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): {
  prevWeek: string;
  centerWeek: string;
  nextWeek: string;
  centerLabel: "今回" | "次回";
  rightLabel: "次回" | "次々回";
} {
  const eventState = getThisWeekEventState(now, config);

  switch (eventState) {
    case EventState.Upcoming: {
      const nextEventDate = getNextEventDate(now, config);
      const centerWeek = getWeekId(nextEventDate);
      return {
        prevWeek: getRelativeWeekId(-1, nextEventDate),
        centerWeek,
        nextWeek: getRelativeWeekId(1, nextEventDate),
        centerLabel: "次回",
        rightLabel: "次々回",
      };
    }
    case EventState.Ongoing:
      return {
        prevWeek: getRelativeWeekId(-1, now),
        centerWeek: getRelativeWeekId(0, now),
        nextWeek: getRelativeWeekId(1, now),
        centerLabel: "今回",
        rightLabel: "次回",
      };
    case EventState.Past: {
      const nextEventDate = getNextEventDate(now, config);
      const centerWeek = getWeekId(nextEventDate);
      return {
        prevWeek: getRelativeWeekId(-1, nextEventDate),
        centerWeek,
        nextWeek: getRelativeWeekId(1, nextEventDate),
        centerLabel: "次回",
        rightLabel: "次々回",
      };
    }
  }
}

// Get the next event week ID
export function getNextEventWeekId(
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): string {
  const eventState = getThisWeekEventState(now, config);
  switch (eventState) {
    case EventState.Upcoming: {
      const nextEventDate = getNextEventDate(now, config);
      return getWeekId(nextEventDate);
    }
    case EventState.Ongoing:
      return getWeekId(now);
    case EventState.Past: {
      const nextEventDateFromPast = getNextEventDate(now, config);
      return getWeekId(nextEventDateFromPast);
    }
  }
}

export type RelativeWeekLabel = "前回" | "今回" | "次回" | "次々回";

// Get label for a specific week ID
// ナビゲーション範囲(前回/今回/次回/次々回)の外側は相対表現が成立しないため null を返す
export function getWeekLabel(
  weekId: string,
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): RelativeWeekLabel | null {
  const { prevWeek, centerWeek, nextWeek, centerLabel, rightLabel } =
    getNavigationWeeks(now, config);

  if (weekId === prevWeek) return "前回";
  if (weekId === centerWeek) return centerLabel;
  if (weekId === nextWeek) return rightLabel;
  return null;
}

// Get the next event date from a given date
export function getNextEventDate(
  from: Date = new Date(),
  config: EventConfig = EVENT_CONFIG,
): Date {
  const targetDayOfWeek = from.getDay();
  const eventDayOfWeek = config.dayOfWeek;

  if (targetDayOfWeek === eventDayOfWeek) {
    // Target date is already the event day
    return from;
  } else {
    // Calculate days until next event day
    let daysUntilEvent = eventDayOfWeek - targetDayOfWeek;
    if (daysUntilEvent <= 0) {
      // Event day already passed this week, go to next week
      daysUntilEvent += 7;
    }
    // Use a temporary variable to avoid mutating the original date
    const result = new Date(from);
    result.setDate(result.getDate() + daysUntilEvent);
    return result;
  }
}
