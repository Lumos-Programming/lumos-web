/**
 * YYYY-MM-DD 形式の日付を「X月Y日」に変換する
 */
export function formatBirthDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  if (!m || !d) return dateStr;
  return `${parseInt(m)}月${parseInt(d)}日`;
}

declare const isoDateStringBrand: unique symbol;

/** YYYY-MM-DD 形式かつ実在する日付であることを検証済みの日付文字列。 */
export type ISODateString = string & { readonly [isoDateStringBrand]: true };

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ISODateParts = {
  year: number;
  month: number;
  day: number;
};

export function getDateParts(value: unknown): ISODateParts | null {
  if (typeof value !== "string") return null;

  // 正規表現として取り出す
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDayOfMonth) return null;

  return { year, month, day };
}

export function isISODateString(value: unknown): value is ISODateString {
  return getDateParts(value) !== null;
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
};

const JST_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getDatePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const part = parts.find((candidate) => candidate.type === type);
  if (!part) {
    throw new Error(`Intl.DateTimeFormat did not return a ${type} part`);
  }
  return Number(part.value);
}

export function getJstToday(now: Date = new Date()): JstToday {
  const parts = JST_PARTS_FORMATTER.formatToParts(now);

  return {
    year: getDatePart(parts, "year"),
    month: getDatePart(parts, "month"),
    day: getDatePart(parts, "day"),
  };
}

/**
 * 誕生日（YYYY-MM-DD）が JST の今日かどうか。
 */
export function isBirthdayToday(
  birthDate: ISODateString,
  today: JstToday,
): boolean {
  const parts = getDateParts(birthDate);
  if (!parts) return false;

  const { month, day } = parts;
  return month === today.month && day === today.day;
}

/**
 * 次の誕生日までの日数。今日が誕生日なら 0。
 * うるう日 (02-29) は平年では 03-01 に繰り上がる JS の挙動をそのまま利用する。
 */
export function daysUntilNextBirthday(
  birthDate: ISODateString,
  today: JstToday,
): number {
  const parts = getDateParts(birthDate);
  if (!parts) {
    throw new TypeError(`Invalid ISO date string: ${birthDate}`);
  }

  const { month, day } = parts;

  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  let nextUtc = Date.UTC(today.year, month - 1, day);
  if (nextUtc < todayUtc) {
    nextUtc = Date.UTC(today.year + 1, month - 1, day);
  }

  return Math.round((nextUtc - todayUtc) / 86_400_000);
}
