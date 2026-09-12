import { describe, expect, it } from "vitest";
import { getTodayBirthdayNames } from "./birthday";
import { getJstToday, isISODateString } from "./date";
import type { MemberDocument } from "./members";
import { profileToMemberInternal } from "./members";

function birthDate(value: string) {
  if (!isISODateString(value))
    throw new Error(`Invalid test birth date: ${value}`);
  return value;
}

function createMemberDocument(birthDate?: string): MemberDocument {
  return {
    discordUsername: "test-user",
    discordAvatar: "",
    studentId: "12345",
    nickname: "テスト",
    lastName: "山田",
    firstName: "太郎",
    bio: "",
    birthDate,
    visibility: {
      studentId: "private",
      nickname: "internal",
      lastName: "internal",
      firstName: "internal",
      faculty: "internal",
      currentOrg: "internal",
      birthDate: "internal",
      gender: "internal",
      bio: "internal",
      github: "internal",
      x: "internal",
      linkedin: "internal",
      line: "internal",
      discord: "internal",
    },
    createdAt: {} as FirebaseFirestore.Timestamp,
    updatedAt: {} as FirebaseFirestore.Timestamp,
  };
}

describe("getTodayBirthdayNames", () => {
  it("今日が誕生日のメンバーをニックネーム優先で返す", () => {
    const today = getJstToday(new Date("2026-09-05T00:00:00Z"));
    const members = [
      {
        name: "山田 太郎",
        nickname: "たろう",
        birthDate: birthDate("2001-09-05"),
      },
      { name: "佐藤 花子", birthDate: birthDate("2002-09-05") },
      { name: "鈴木 次郎", birthDate: birthDate("2001-09-06") },
      { name: "高橋 三郎" },
    ];

    expect(getTodayBirthdayNames(members, today)).toEqual([
      "たろう",
      "佐藤 花子",
    ]);
  });
});

describe("birthday field validation", () => {
  const today = getJstToday(new Date("2026-09-05T00:00:00Z"));

  it.each(["not-a-date", "2001-9-05", "2001-02-29", "2001-13-01"])(
    "omits corrupted Firestore value %s safely",
    (birthDate) => {
      const member = profileToMemberInternal(
        "discord-id",
        createMemberDocument(birthDate),
      );

      expect(member.birthDate).toBeUndefined();
      expect(getTodayBirthdayNames([member], today)).toEqual([]);
    },
  );

  it("keeps a valid date usable by birthday logic", () => {
    const member = profileToMemberInternal(
      "discord-id",
      createMemberDocument("2000-02-29"),
    );
    const leapDay = getJstToday(new Date("2028-02-29T00:00:00Z"));

    expect(member.birthDate).toBe("2000-02-29");
    expect(getTodayBirthdayNames([member], leapDay)).toEqual(["テスト"]);
  });
});
