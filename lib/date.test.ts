import { describe, it, expect } from "vitest";
import {
  formatBirthDate,
  getJstToday,
  isBirthdayToday,
  daysUntilNextBirthday,
} from "./date";

describe("formatBirthDate", () => {
  it("YYYY-MM-DD を「X月Y日」に変換する", () => {
    expect(formatBirthDate("2001-09-05")).toBe("9月5日");
    expect(formatBirthDate("2001-12-25")).toBe("12月25日");
  });

  it("不正な形式はそのまま返す", () => {
    expect(formatBirthDate("2001")).toBe("2001");
  });
});

describe("getJstToday", () => {
  it("UTC 深夜でも JST の日付を返す", () => {
    // 2026-08-30T16:00:00Z = 2026-08-31 01:00 JST（UTC では前日のまま）
    expect(getJstToday(new Date("2026-08-30T16:00:00Z"))).toEqual({
      year: 2026,
      month: 8,
      day: 31,
      monthDay: "08-31",
    });
  });

  it("JST 深夜直前は当日のまま", () => {
    // 2026-08-30T14:59:00Z = 2026-08-30 23:59 JST
    expect(getJstToday(new Date("2026-08-30T14:59:00Z")).monthDay).toBe(
      "08-30",
    );
  });

  it("Cloud Scheduler の起動時刻 (09:00 JST) で当日を返す", () => {
    // 2026-01-01T00:00:00Z = 2026-01-01 09:00 JST
    expect(getJstToday(new Date("2026-01-01T00:00:00Z"))).toEqual({
      year: 2026,
      month: 1,
      day: 1,
      monthDay: "01-01",
    });
  });

  it("年をまたぐ境界を正しく扱う", () => {
    // 2025-12-31T15:00:00Z = 2026-01-01 00:00 JST
    expect(getJstToday(new Date("2025-12-31T15:00:00Z"))).toEqual({
      year: 2026,
      month: 1,
      day: 1,
      monthDay: "01-01",
    });
  });
});

describe("isBirthdayToday", () => {
  const today = getJstToday(new Date("2026-08-31T00:00:00Z"));

  it("月日が一致すれば年が違っても true", () => {
    expect(isBirthdayToday("2001-08-31", today)).toBe(true);
  });

  it("月日が違えば false", () => {
    expect(isBirthdayToday("2001-08-30", today)).toBe(false);
    expect(isBirthdayToday("2001-07-31", today)).toBe(false);
  });
});

describe("daysUntilNextBirthday", () => {
  const today = getJstToday(new Date("2026-08-31T00:00:00Z")); // 8/31 JST

  it("今日が誕生日なら 0", () => {
    expect(daysUntilNextBirthday("2001-08-31", today)).toBe(0);
  });

  it("今年これから来る誕生日までの日数", () => {
    expect(daysUntilNextBirthday("2001-09-01", today)).toBe(1);
    expect(daysUntilNextBirthday("2001-12-25", today)).toBe(116);
  });

  it("今年分を過ぎた誕生日は翌年で数える", () => {
    expect(daysUntilNextBirthday("2001-08-30", today)).toBe(364);
    expect(daysUntilNextBirthday("2001-01-01", today)).toBe(123);
  });

  it("年をまたぐ直近の誕生日を正しく数える（一覧の20日絞り込みが依存）", () => {
    // 12/25 時点で 1/3 の誕生日は 9 日後。年をまたいでも小さい値になる
    const dec = getJstToday(new Date("2026-12-25T00:00:00Z"));
    expect(daysUntilNextBirthday("2001-01-03", dec)).toBe(9);
    // 12/31 の翌日 1/1 は 1 日後
    const yearEnd = getJstToday(new Date("2026-12-31T00:00:00Z"));
    expect(daysUntilNextBirthday("2001-01-01", yearEnd)).toBe(1);
  });

  it("サマータイムを持たない JST でも日数がズレない", () => {
    // 日数計算は UTC 基準の固定オフセットで行うため、境界月でも整数日になる
    const march = getJstToday(new Date("2026-03-01T00:00:00Z"));
    expect(daysUntilNextBirthday("2001-03-31", march)).toBe(30);
  });
});
