import { describe, expect, it } from "vitest";
import { summarizeSurvey } from "./survey-summary";
import type { SurveyQuestion, SurveyResponse } from "@/types/survey";

const questions: SurveyQuestion[] = [
  { id: "r", type: "rating", label: "期待度", required: true },
  {
    id: "c",
    type: "choice",
    label: "参加",
    required: true,
    options: ["参加", "不参加", "未定"],
  },
  { id: "t", type: "text", label: "ひとこと", required: false },
];

function res(memberId: string, answers: SurveyResponse["answers"]) {
  return { memberId, answers, submittedAt: null, updatedAt: null };
}

describe("summarizeSurvey", () => {
  it("returns zeroed results when there are no responses", () => {
    const [r, c, t] = summarizeSurvey(questions, []);
    expect(r).toMatchObject({
      answeredCount: 0,
      average: null,
      counts: [0, 0, 0, 0, 0],
    });
    expect(c).toMatchObject({ answeredCount: 0, counts: [0, 0, 0] });
    expect(t).toMatchObject({ answeredCount: 0, answers: [] });
  });

  it("computes average, rating counts, choice counts and text list", () => {
    const [r, c, t] = summarizeSurvey(questions, [
      res("a", { r: 5, c: "参加", t: "楽しみ" }),
      res("b", { r: 4, c: "参加" }),
      res("c", { r: 2, c: "未定", t: "遅れます" }),
    ]);
    expect(r).toMatchObject({ answeredCount: 3, counts: [0, 1, 0, 1, 1] });
    expect((r as { average: number }).average).toBeCloseTo(11 / 3);
    expect(c).toMatchObject({ answeredCount: 3, counts: [2, 0, 1] });
    expect(t).toMatchObject({
      answeredCount: 2,
      answers: [
        { memberId: "a", text: "楽しみ" },
        { memberId: "c", text: "遅れます" },
      ],
    });
  });

  it("ignores values that do not fit the current definition", () => {
    const [r, c] = summarizeSurvey(questions, [
      res("a", { r: 7, c: "消えた選択肢" }),
      res("b", { r: 2.5, c: 1 }),
      res("c", { r: 3, c: "不参加" }),
    ]);
    expect(r).toMatchObject({ answeredCount: 1, average: 3 });
    expect(c).toMatchObject({ answeredCount: 1, counts: [0, 1, 0] });
  });
});
