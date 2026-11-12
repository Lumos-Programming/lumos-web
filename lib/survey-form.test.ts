import { describe, expect, it } from "vitest";
import {
  collectAnswerUsage,
  findSurveyChangeConflict,
  surveyDefinitionSchema,
  validateSurveyAnswers,
} from "./survey-form";
import type { SurveyDefinition, SurveyQuestion } from "@/types/survey";

const rating: SurveyQuestion = {
  id: "q_rate",
  type: "rating",
  label: "期待度",
  required: true,
};
const choice: SurveyQuestion = {
  id: "q_join",
  type: "choice",
  label: "参加しますか",
  required: true,
  options: ["参加", "不参加", "未定"],
};
const text: SurveyQuestion = {
  id: "q_memo",
  type: "text",
  label: "ひとこと",
  required: false,
};
const questions = [rating, choice, text];

describe("surveyDefinitionSchema", () => {
  it("accepts the three question types and trims labels/options", () => {
    const parsed = surveyDefinitionSchema.parse({
      questions: [
        { ...rating, label: "  期待度  " },
        { ...choice, options: [" 参加 ", "不参加"] },
        text,
      ],
    });
    expect(parsed.questions[0].label).toBe("期待度");
    expect(parsed.questions[1]).toMatchObject({ options: ["参加", "不参加"] });
  });

  it.each([
    { name: "no questions", value: { questions: [] } },
    { name: "missing questions", value: {} },
    {
      name: "unknown type",
      value: { questions: [{ ...rating, type: "checkbox" }] },
    },
    { name: "empty label", value: { questions: [{ ...rating, label: "  " }] } },
    {
      name: "too long label",
      value: { questions: [{ ...rating, label: "あ".repeat(201) }] },
    },
    { name: "bad id", value: { questions: [{ ...rating, id: "a/b" }] } },
    { name: "empty id", value: { questions: [{ ...rating, id: "" }] } },
    {
      name: "duplicate ids",
      value: { questions: [rating, { ...text, id: rating.id }] },
    },
    {
      name: "choice with one option",
      value: { questions: [{ ...choice, options: ["参加"] }] },
    },
    {
      name: "choice with an empty option",
      value: { questions: [{ ...choice, options: ["参加", " "] }] },
    },
    {
      name: "choice with duplicated options",
      value: { questions: [{ ...choice, options: ["参加", "参加 "] }] },
    },
    {
      name: "choice without options",
      value: { questions: [{ ...rating, type: "choice" }] },
    },
    {
      name: "options on a rating question",
      value: { questions: [{ ...rating, options: ["a", "b"] }] },
    },
    {
      name: "extra field",
      value: { questions: [{ ...rating, points: 10 }] },
    },
    { name: "extra top-level field", value: { questions: [rating], x: 1 } },
    {
      name: "required not boolean",
      value: { questions: [{ ...rating, required: "yes" }] },
    },
    {
      name: "31 questions",
      value: {
        questions: Array.from({ length: 31 }, (_, i) => ({
          ...rating,
          id: `q${i}`,
        })),
      },
    },
  ])("rejects $name", ({ value }) => {
    expect(surveyDefinitionSchema.safeParse(value).success).toBe(false);
  });
});

describe("validateSurveyAnswers", () => {
  it("accepts a full valid answer", () => {
    expect(
      validateSurveyAnswers(questions, {
        q_rate: 5,
        q_join: "参加",
        q_memo: "楽しみ",
      }),
    ).toEqual({ q_rate: 5, q_join: "参加", q_memo: "楽しみ" });
  });

  it("drops an unanswered or blank optional question and trims text", () => {
    expect(
      validateSurveyAnswers(questions, { q_rate: 1, q_join: "未定" }),
    ).toEqual({ q_rate: 1, q_join: "未定" });
    expect(
      validateSurveyAnswers(questions, {
        q_rate: 1,
        q_join: "未定",
        q_memo: "   ",
      }),
    ).toEqual({ q_rate: 1, q_join: "未定" });
    expect(
      validateSurveyAnswers(questions, {
        q_rate: 1,
        q_join: "未定",
        q_memo: "  よろしく ",
      }),
    ).toEqual({ q_rate: 1, q_join: "未定", q_memo: "よろしく" });
  });

  it("accepts text exactly at the length limit", () => {
    expect(
      validateSurveyAnswers([text], { q_memo: "あ".repeat(2000) }),
    ).not.toBeNull();
  });

  it.each([
    { name: "missing required rating", value: { q_join: "参加" } },
    { name: "missing required choice", value: { q_rate: 3 } },
    { name: "rating 0", value: { q_rate: 0, q_join: "参加" } },
    { name: "rating 6", value: { q_rate: 6, q_join: "参加" } },
    { name: "rating 2.5", value: { q_rate: 2.5, q_join: "参加" } },
    { name: "rating as string", value: { q_rate: "3", q_join: "参加" } },
    { name: "rating NaN", value: { q_rate: Number.NaN, q_join: "参加" } },
    { name: "choice not in options", value: { q_rate: 3, q_join: "たぶん" } },
    { name: "choice as number", value: { q_rate: 3, q_join: 0 } },
    { name: "null answer", value: { q_rate: 3, q_join: "参加", q_memo: null } },
    {
      name: "too long text",
      value: { q_rate: 3, q_join: "参加", q_memo: "あ".repeat(2001) },
    },
    {
      name: "unknown question id",
      value: { q_rate: 3, q_join: "参加", q_other: "x" },
    },
    { name: "non-object", value: "q_rate=3" },
    { name: "null", value: null },
    { name: "array", value: [3, "参加"] },
  ])("rejects $name", ({ value }) => {
    expect(validateSurveyAnswers(questions, value)).toBeNull();
  });

  it("requires non-blank text for a required text question", () => {
    const q = [{ ...text, required: true }];
    expect(validateSurveyAnswers(q, { q_memo: "  " })).toBeNull();
    expect(validateSurveyAnswers(q, {})).toBeNull();
  });
});

describe("findSurveyChangeConflict", () => {
  const usage = collectAnswerUsage([
    { q_rate: 4, q_join: "参加" },
    { q_rate: 2, q_join: "参加" },
  ]);
  const after = (qs: SurveyQuestion[]): SurveyDefinition => ({ questions: qs });

  it("allows anything when there are no answers", () => {
    expect(findSurveyChangeConflict(questions, null, new Map())).toBeNull();
    expect(
      findSurveyChangeConflict(questions, after([text]), new Map()),
    ).toBeNull();
  });

  it("allows label/required edits, additions, and removing unanswered questions", () => {
    expect(
      findSurveyChangeConflict(
        questions,
        after([
          { ...rating, label: "新しい質問文", required: false },
          { ...choice, options: ["参加", "オンライン参加"] },
          { id: "q_new", type: "text", label: "追加", required: true },
        ]),
        usage,
      ),
    ).toBeNull();
  });

  it("blocks removing an answered question", () => {
    expect(
      findSurveyChangeConflict(questions, after([choice]), usage),
    ).toContain("期待度");
  });

  it("blocks changing the type of an answered question", () => {
    expect(
      findSurveyChangeConflict(
        questions,
        after([{ ...rating, type: "text" }, choice]),
        usage,
      ),
    ).toContain("種類");
  });

  it("blocks removing or renaming a chosen option", () => {
    expect(
      findSurveyChangeConflict(
        questions,
        after([rating, { ...choice, options: ["参加する", "不参加"] }]),
        usage,
      ),
    ).toContain("「参加」");
  });

  it("blocks removing the whole survey when answers exist", () => {
    expect(findSurveyChangeConflict(questions, null, usage)).toContain(
      "削除できません",
    );
  });

  it("collects usage per question", () => {
    expect([...usage.get("q_rate")!]).toEqual([4, 2]);
    expect([...usage.get("q_join")!]).toEqual(["参加"]);
    expect(usage.has("q_memo")).toBe(false);
  });
});
