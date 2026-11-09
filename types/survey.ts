/**
 * アンケートの質問と回答の型。
 *
 * いまはイベントごとの事前アンケート (events/{id}.survey) で使っているが、
 * 汎用のアンケート機能 (#361) でも同じ型を使い回せるよう、イベントには依存させない。
 */

/**
 * 質問の種類は 3 つに絞る。
 * - rating: 5 段階評価 (1〜5 の整数)
 * - choice: 選択肢から 1 つ選ぶ
 * - text: 自由記述
 */
export const SURVEY_QUESTION_TYPES = ["rating", "choice", "text"] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  rating: "5段階評価",
  choice: "選択式",
  text: "自由記述",
};

/** 入力の上限。サーバーとフォームで同じ値を使う */
export const SURVEY_LIMITS = {
  maxQuestions: 30,
  labelMax: 200,
  maxOptions: 20,
  optionMax: 100,
  textAnswerMax: 2000,
  /** 5 段階評価の範囲 */
  ratingMin: 1,
  ratingMax: 5,
} as const;

interface SurveyQuestionBase {
  /**
   * 質問の ID。回答はこの ID をキーに保存するので、文言を直しても回答と対応が崩れない。
   * 英数字・"-"・"_" のみ。
   */
  id: string;
  label: string;
  required: boolean;
}

export interface RatingQuestion extends SurveyQuestionBase {
  type: "rating";
}

export interface ChoiceQuestion extends SurveyQuestionBase {
  type: "choice";
  /** 選択肢の文言。回答にはこの文字列そのものを保存する */
  options: string[];
}

export interface TextQuestion extends SurveyQuestionBase {
  type: "text";
}

export type SurveyQuestion = RatingQuestion | ChoiceQuestion | TextQuestion;

export interface SurveyDefinition {
  questions: SurveyQuestion[];
}

/** 回答の値。rating は数値、choice は選択肢の文字列、text は入力文字列 */
export type SurveyAnswerValue = number | string;

/** 質問 ID → 回答。任意の質問に答えなかった場合はキーごと省く */
export type SurveyAnswers = Record<string, SurveyAnswerValue>;

/** 1 人分の回答。Timestamp は ISO 文字列に変換済み */
export interface SurveyResponse {
  memberId: string;
  answers: SurveyAnswers;
  /** 最初に回答した日時。回答を編集しても変わらない */
  submittedAt: string | null;
  updatedAt: string | null;
}

/** 質問ごとの集計 */
export type SurveyQuestionSummary =
  | {
      question: RatingQuestion;
      answeredCount: number;
      /** 回答が 0 件なら null */
      average: number | null;
      /** 評価値 (1〜5) ごとの件数。index 0 が評価 1 */
      counts: number[];
    }
  | {
      question: ChoiceQuestion;
      answeredCount: number;
      /** options と同じ順の件数 */
      counts: number[];
    }
  | {
      question: TextQuestion;
      answeredCount: number;
      /** 回答順 (submittedAt 順) の自由記述 */
      answers: { memberId: string; text: string }[];
    };
