import { z } from "zod";
import {
  SURVEY_LIMITS,
  type SurveyAnswers,
  type SurveyDefinition,
  type SurveyQuestion,
} from "@/types/survey";

/**
 * アンケートの質問定義と回答の検証。サーバー (lib/survey.ts) と入力フォームの両方で使う。
 * Firestore には依存させないので Client Component からも import できる。
 * 汎用アンケート (#361) でもこのまま使える形にしておく。
 */

const questionIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "質問 ID の形式が正しくありません");

const labelSchema = z
  .string()
  .trim()
  .min(1, "質問文を入力してください")
  .max(
    SURVEY_LIMITS.labelMax,
    `質問文は ${SURVEY_LIMITS.labelMax} 文字以内にしてください`,
  );

const optionSchema = z
  .string()
  .trim()
  .min(1, "空の選択肢があります")
  .max(
    SURVEY_LIMITS.optionMax,
    `選択肢は ${SURVEY_LIMITS.optionMax} 文字以内にしてください`,
  );

const questionBase = {
  id: questionIdSchema,
  label: labelSchema,
  required: z.boolean(),
};

const questionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...questionBase, type: z.literal("rating") }),
  z.strictObject({
    ...questionBase,
    type: z.literal("choice"),
    options: z
      .array(optionSchema)
      .min(2, "選択肢は 2 つ以上にしてください")
      .max(
        SURVEY_LIMITS.maxOptions,
        `選択肢は ${SURVEY_LIMITS.maxOptions} 個までです`,
      ),
  }),
  z.strictObject({ ...questionBase, type: z.literal("text") }),
]);

/** 質問定義の検証。質問 ID と、同じ質問内の選択肢は重複させない */
export const surveyDefinitionSchema = z
  .strictObject({
    questions: z
      .array(questionSchema)
      .min(1, "質問を 1 つ以上追加してください")
      .max(
        SURVEY_LIMITS.maxQuestions,
        `質問は ${SURVEY_LIMITS.maxQuestions} 個までです`,
      ),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    for (const q of value.questions) {
      if (ids.has(q.id)) {
        ctx.addIssue({ code: "custom", message: "質問 ID が重複しています" });
      }
      ids.add(q.id);
      if (q.type === "choice" && new Set(q.options).size !== q.options.length) {
        ctx.addIssue({
          code: "custom",
          message: `「${q.label}」に同じ選択肢が複数あります`,
        });
      }
    }
  });

/** 1 問分の回答の検証 */
function answerSchemaFor(question: SurveyQuestion): z.ZodType {
  switch (question.type) {
    case "rating": {
      const schema = z
        .number()
        .int()
        .min(SURVEY_LIMITS.ratingMin)
        .max(SURVEY_LIMITS.ratingMax);
      return question.required ? schema : schema.optional();
    }
    case "choice": {
      const options = question.options;
      const schema = z.string().refine((v) => options.includes(v));
      return question.required ? schema : schema.optional();
    }
    case "text": {
      const schema = z.string().trim().max(SURVEY_LIMITS.textAnswerMax);
      return question.required ? schema.min(1) : schema.optional();
    }
  }
}

/** 回答として受け付ける形。質問にない ID や想定外の値の型は弾く */
function answersSchemaFor(questions: SurveyQuestion[]) {
  return z.strictObject(
    Object.fromEntries(questions.map((q) => [q.id, answerSchemaFor(q)])),
  );
}

/**
 * 質問定義に沿って回答を検証する。不正なら null。
 * 任意の質問の未回答 (キーなし、または自由記述の空文字) は保存しない。
 */
export function validateSurveyAnswers(
  questions: SurveyQuestion[],
  input: unknown,
): SurveyAnswers | null {
  const parsed = answersSchemaFor(questions).safeParse(input);
  if (!parsed.success) return null;

  const answers: SurveyAnswers = {};
  for (const [id, value] of Object.entries(parsed.data)) {
    if (value === undefined || value === "") continue;
    answers[id] = value as number | string;
  }
  return answers;
}

/** 回答で使われている値を質問 ID ごとに集める (質問変更の可否の判定用) */
export function collectAnswerUsage(
  answersList: SurveyAnswers[],
): Map<string, Set<SurveyAnswers[string]>> {
  const usage = new Map<string, Set<SurveyAnswers[string]>>();
  for (const answers of answersList) {
    for (const [id, value] of Object.entries(answers)) {
      if (!usage.has(id)) usage.set(id, new Set());
      usage.get(id)!.add(value);
    }
  }
  return usage;
}

/**
 * 回答がある状態で質問を変えてよいかを判定する。問題がなければ null、
 * 変えられない場合は運営に見せる理由を返す。
 *
 * 既存の回答が宙に浮かないよう、回答のある質問について次の変更は禁止する。
 * - 質問の削除 (アンケート自体の削除を含む)
 * - 質問の種類の変更
 * - 回答で選ばれている選択肢の削除・文言変更
 * 質問文・必須/任意の変更、質問や選択肢の追加は許す。
 */
export function findSurveyChangeConflict(
  before: SurveyQuestion[],
  after: SurveyDefinition | null,
  usage: Map<string, Set<SurveyAnswers[string]>>,
): string | null {
  const answered = before.filter((q) => usage.has(q.id));
  if (answered.length === 0) return null;
  if (after === null) {
    return "回答があるためアンケートを削除できません";
  }

  const afterById = new Map(after.questions.map((q) => [q.id, q]));
  for (const q of answered) {
    const next = afterById.get(q.id);
    if (!next) {
      return `「${q.label}」には回答があるため削除できません`;
    }
    if (next.type !== q.type) {
      return `「${q.label}」には回答があるため種類を変更できません`;
    }
    if (next.type === "choice") {
      for (const value of usage.get(q.id)!) {
        if (!next.options.includes(value as string)) {
          return `「${q.label}」の選択肢「${value}」は回答で選ばれているため削除・変更できません`;
        }
      }
    }
  }
  return null;
}
