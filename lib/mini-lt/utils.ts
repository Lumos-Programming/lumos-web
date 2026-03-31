import { format, addWeeks, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export function getWeekId(date: Date = new Date()): string {
  // ISOWeek format: 2026-W09
  return format(date, "RRRR-'W'II")
}

export function getRelativeWeekId(offset: number, from: Date = new Date()): string {
  const date = addWeeks(from, offset)
  return getWeekId(date)
}

export function getWeekDateFromWeekId(weekId: string): Date {
  // weekId format: "2026-W09"
  const [year, week] = weekId.split('-W')
  // ISO week date format: 2026-W09-1 (Monday)
  const isoDate = `${year}-W${week.padStart(2, '0')}-1`
  return parseISO(isoDate)
}

export function formatWeekDate(weekId: string): string {
  try {
    const monday = getWeekDateFromWeekId(weekId)
    return format(monday, 'M月d日(E)', { locale: ja })
  } catch {
    return weekId
  }
}

// Event configuration type
export type EventConfig = {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: number // 0-23
  endHour: number // 1-24 (exclusive)
}

// Event configuration - easy to modify when event schedule changes
export const EVENT_CONFIG: EventConfig = {
  dayOfWeek: 1, // Monday
  startHour: 21, // 21:00
  endHour: 24, // 24:00 (midnight, exclusive)
}

// Check if currently during event time
export function isDuringEvent(now: Date = new Date(), config: EventConfig = EVENT_CONFIG): boolean {
  const dayOfWeek = now.getDay()
  const hour = now.getHours()
  return dayOfWeek === config.dayOfWeek && hour >= config.startHour && hour < config.endHour
}

// Get week IDs for navigation (prev, center, next)
export function getNavigationWeeks(
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG
): {
  prevWeek: string
  centerWeek: string
  nextWeek: string
  centerLabel: '今回' | '次回'
  rightLabel: '次回' | '次々回'
} {
  const duringEvent = isDuringEvent(now, config)

  if (duringEvent) {
    // During event: prev=last week, center=this week (ongoing), next=next week
    return {
      prevWeek: getRelativeWeekId(-1, now),
      centerWeek: getRelativeWeekId(0, now),
      nextWeek: getRelativeWeekId(1, now),
      centerLabel: '今回',
      rightLabel: '次回',
    }
  } else {
    // Not during event: prev=this week (finished), center=next week, next=week after
    return {
      prevWeek: getRelativeWeekId(0, now),
      centerWeek: getRelativeWeekId(1, now),
      nextWeek: getRelativeWeekId(2, now),
      centerLabel: '次回',
      rightLabel: '次々回',
    }
  }
}

// Get the next event week ID
export function getNextEventWeekId(
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG
): string {
  const duringEvent = isDuringEvent(now, config)
  // During event: this week, otherwise: next week
  return duringEvent ? getWeekId(now) : getRelativeWeekId(1, now)
}

// Get label for a specific week ID
export function getWeekLabel(
  weekId: string,
  now: Date = new Date(),
  config: EventConfig = EVENT_CONFIG
): '前回' | '今回' | '次回' | '次々回' | '今週' {
  const { prevWeek, centerWeek, nextWeek, centerLabel, rightLabel } = getNavigationWeeks(
    now,
    config
  )

  if (weekId === prevWeek) return '前回'
  if (weekId === centerWeek) return centerLabel
  if (weekId === nextWeek) return rightLabel
  return '今週'
}

// Get the next event date from a given date
export function getNextEventDate(
  from: Date = new Date(),
  config: EventConfig = EVENT_CONFIG
): Date {
  const targetDayOfWeek = from.getDay()
  const eventDayOfWeek = config.dayOfWeek

  if (targetDayOfWeek === eventDayOfWeek) {
    // Target date is already the event day
    return from
  } else {
    // Calculate days until next event day
    let daysUntilEvent = eventDayOfWeek - targetDayOfWeek
    if (daysUntilEvent <= 0) {
      // Event day already passed this week, go to next week
      daysUntilEvent += 7
    }
    // Use a temporary variable to avoid mutating the original date
    const result = new Date(from)
    result.setDate(result.getDate() + daysUntilEvent)
    return result
  }
}
