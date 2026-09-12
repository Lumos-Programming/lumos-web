import { describe, expect, it } from "vitest";
import { getTodayBirthdayNames } from "./birthday";
import { getJstToday } from "./date";

describe("getTodayBirthdayNames", () => {
  it("今日が誕生日のメンバーをニックネーム優先で返す", () => {
    const today = getJstToday(new Date("2026-09-05T00:00:00Z"));
    const members = [
      {
        name: "山田 太郎",
        nickname: "たろう",
        birthDate: "2001-09-05",
      },
      { name: "佐藤 花子", birthDate: "2002-09-05" },
      { name: "鈴木 次郎", birthDate: "2001-09-06" },
      { name: "高橋 三郎" },
    ];

    expect(getTodayBirthdayNames(members, today)).toEqual([
      "たろう",
      "佐藤 花子",
    ]);
  });
});
