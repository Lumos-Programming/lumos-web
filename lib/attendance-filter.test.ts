import { describe, expect, it } from "vitest";
import {
  candidateLabel,
  filterCandidates,
  partitionCandidates,
} from "./attendance-filter";
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

describe("partitionCandidates", () => {
  const all = [
    c({ id: "a", fullName: "安藤" }),
    c({ id: "b", fullName: "伊藤" }),
    c({ id: "c", fullName: "上田" }),
    c({ id: "d", fullName: "江藤" }),
    c({ id: "e", fullName: "大野" }),
  ];
  const ids = (list: AttendanceCandidate[]) => list.map((x) => x.id);

  it("puts survey respondents first, then walk-in attendees, then the rest", () => {
    // b, d が回答者。d と e は出席済み (e は未回答で飛び込み)
    const { respondents, attendees, others } = partitionCandidates(
      all,
      new Set(["d", "e"]),
      new Set(["b", "d"]),
    );
    expect(ids(respondents)).toEqual(["b", "d"]);
    expect(ids(attendees)).toEqual(["e"]);
    expect(ids(others)).toEqual(["a", "c"]);
  });

  it("does not treat answering as attendance", () => {
    const { respondents, attendees } = partitionCandidates(
      all,
      new Set(),
      new Set(["b"]),
    );
    expect(ids(respondents)).toEqual(["b"]);
    expect(attendees).toEqual([]);
  });

  it("places every candidate in exactly one group", () => {
    const groups = partitionCandidates(
      all,
      new Set(["a", "b"]),
      new Set(["b", "x"]),
    );
    const flat = [...groups.respondents, ...groups.attendees, ...groups.others];
    expect(ids(flat).sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("works with no respondents (same as before)", () => {
    const { respondents, attendees, others } = partitionCandidates(
      all,
      new Set(["c"]),
      new Set(),
    );
    expect(respondents).toEqual([]);
    expect(ids(attendees)).toEqual(["c"]);
    expect(others).toHaveLength(4);
  });

  it("keeps walk-ins (non-respondents) searchable after filtering", () => {
    const filtered = filterCandidates(members, "はなこ");
    const { respondents, others } = partitionCandidates(
      filtered,
      new Set(),
      new Set(["1"]),
    );
    expect(respondents).toEqual([]);
    expect(ids(others)).toEqual(["2"]);
  });

  it("filters respondents by the search too", () => {
    const filtered = filterCandidates(members, "yamada");
    const { respondents, others } = partitionCandidates(
      filtered,
      new Set(),
      new Set(["1", "2"]),
    );
    expect(ids(respondents)).toEqual(["1"]);
    expect(others).toEqual([]);
  });
});
