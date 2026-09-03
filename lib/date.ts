/**
 * YYYY-MM-DD 形式の日付を「X月Y日」に変換する
 */
export function formatBirthDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  if (!m || !d) return dateStr;
  return `${parseInt(m)}月${parseInt(d)}日`;
}

/**
 * Asia/Tokyo における「今日」。
 *
 * Cloud Run のサーバーは UTC で動くため、素の `new Date().getDate()` は JST の
 * 15:00〜24:00（UTC の 06:00〜15:00 ではなく、UTC 日付が前日のままの時間帯）で
 * 前日を指してしまう。誕生日判定はサーバー・ブラウザ双方で同じ結果になる必要が
 * あるため、タイムゾーンを Asia/Tokyo に固定して算出する。
 */
export type JstToday = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  /** "MM-DD" 形式。birthDate.slice(5) と直接比較できる */
  monthDay: string;
};

const JST_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getJstToday(now: Date = new Date()): JstToday {
  const parts = JST_PARTS_FORMATTER.formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;

  const mm = pick("month");
  const dd = pick("day");

  return {
    year: Number(pick("year")),
    month: Number(mm),
    day: Number(dd),
    monthDay: `${mm}-${dd}`,
  };
}

/**
 * 誕生日（YYYY-MM-DD）が JST の今日かどうか。
 */
export function isBirthdayToday(birthDate: string, today: JstToday): boolean {
  return birthDate.slice(5) === today.monthDay;
}

/**
 * 次の誕生日までの日数。今日が誕生日なら 0。
 * うるう日 (02-29) は平年では 03-01 に繰り上がる JS の挙動をそのまま利用する。
 */
export function daysUntilNextBirthday(
  birthDate: string,
  today: JstToday,
): number {
  const [, month, day] = birthDate.split("-").map(Number);

  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  let nextUtc = Date.UTC(today.year, month - 1, day);
  if (nextUtc < todayUtc) {
    nextUtc = Date.UTC(today.year + 1, month - 1, day);
  }

  return Math.round((nextUtc - todayUtc) / 86_400_000);
}
