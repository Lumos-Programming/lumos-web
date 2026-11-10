import { describe, expect, it } from "vitest";
import { candidateLabel, filterCandidates } from "./attendance-filter";
import type { AttendanceCandidate } from "@/types/event";

function c(over: Partial<AttendanceCandidate>): AttendanceCandidate {
  return {
    id: "id",
    fullName: "",
    nickname: "",
    discordUsername: "",
    avatar: "",
    ...over,
  };
}

const members = [
  c({
    id: "1",
    fullName: "山田 太郎",
    nickname: "タロウ",
    discordUsername: "Yamada_T",
  }),
  c({
    id: "2",
    fullName: "鈴木 花子",
    nickname: "はなこ",
    discordUsername: "hana",
  }),
  c({ id: "3", nickname: "ＡＢＣ", discordUsername: "abc123" }),
];

const ids = (q: string) => filterCandidates(members, q).map((m) => m.id);

describe("filterCandidates", () => {
  it("returns everyone for an empty or blank query", () => {
    expect(ids("")).toEqual(["1", "2", "3"]);
    expect(ids("   ")).toEqual(["1", "2", "3"]);
  });

  it("matches full name ignoring spaces", () => {
    expect(ids("山田太郎")).toEqual(["1"]);
    expect(ids("山田 太")).toEqual(["1"]);
  });

  it("treats katakana and hiragana as the same", () => {
    expect(ids("たろう")).toEqual(["1"]);
    expect(ids("ハナコ")).toEqual(["2"]);
  });

  it("ignores case and full-width/half-width differences", () => {
    expect(ids("yamada")).toEqual(["1"]);
    expect(ids("abc")).toEqual(["3"]);
    expect(ids("ＨＡＮＡ")).toEqual(["2"]);
  });

  it("returns nothing when no field matches", () => {
    expect(ids("佐藤")).toEqual([]);
  });
});

describe("candidateLabel", () => {
  it("prefers full name, then nickname, then Discord name, then ID", () => {
    expect(candidateLabel(c({ fullName: "A", nickname: "B" }))).toBe("A");
    expect(candidateLabel(c({ nickname: "B", discordUsername: "C" }))).toBe(
      "B",
    );
    expect(candidateLabel(c({ discordUsername: "C" }))).toBe("C");
    expect(candidateLabel(c({ id: "999" }))).toBe("999");
  });
});
