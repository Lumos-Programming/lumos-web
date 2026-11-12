import {
  SURVEY_LIMITS,
  type SurveyQuestion,
  type SurveyQuestionSummary,
  type SurveyResponse,
} from "@/types/survey";

/**
 * 質問ごとに回答を集計する。
 * - 5段階評価: 平均と評価値ごとの件数
 * - 選択式: 選択肢ごとの件数
 * - 自由記述: 回答の一覧
 * 現在の質問定義に合わない値 (範囲外の評価・存在しない選択肢) は数えない。
 */
export function summarizeSurvey(
  questions: SurveyQuestion[],
  responses: SurveyResponse[],
): SurveyQuestionSummary[] {
  return questions.map((question) => {
    const values = responses
      .filter((r) => r.answers[question.id] !== undefined)
      .map((r) => ({ memberId: r.memberId, value: r.answers[question.id] }));

    switch (question.type) {
      case "rating": {
        const counts = Array(
          SURVEY_LIMITS.ratingMax - SURVEY_LIMITS.ratingMin + 1,
        ).fill(0);
        let sum = 0;
        let answeredCount = 0;
        for (const { value } of values) {
          if (
            typeof value !== "number" ||
            !Number.isInteger(value) ||
            value < SURVEY_LIMITS.ratingMin ||
            value > SURVEY_LIMITS.ratingMax
          ) {
            continue;
          }
          counts[value - SURVEY_LIMITS.ratingMin]++;
          sum += value;
          answeredCount++;
        }
        return {
          question,
          answeredCount,
          average: answeredCount === 0 ? null : sum / answeredCount,
          counts,
        };
      }
      case "choice": {
        const counts = question.options.map(() => 0);
        let answeredCount = 0;
        for (const { value } of values) {
          const index =
            typeof value === "string" ? question.options.indexOf(value) : -1;
          if (index === -1) continue;
          counts[index]++;
          answeredCount++;
        }
        return { question, answeredCount, counts };
      }
      case "text": {
        const answers = values
          .filter(
            (v): v is { memberId: string; value: string } =>
              typeof v.value === "string" && v.value !== "",
          )
          .map((v) => ({ memberId: v.memberId, text: v.value }));
        return { question, answeredCount: answers.length, answers };
      }
    }
  });
}
