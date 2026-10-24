/**
 * 記事登録フォームの自動入力。取得した値をどの欄に入れるか / いつ消すかを決める。
 * フォームの state を直接触らない純粋関数にして、コンポーネントから呼ぶ。
 */

import { detectBlogPlatform } from "@/lib/blog-metadata";

/** 自動入力する欄。platformPreset は媒体のセレクトの値 */
export const AUTOFILL_KEYS = [
  "thumbnailUrl",
  "title",
  "description",
  "publishedAt",
  "platformPreset",
] as const;
export type AutofillKey = (typeof AUTOFILL_KEYS)[number];
export type AutofillValues = Partial<Record<AutofillKey, string>>;

type AutofillForm = Record<AutofillKey, string>;

/**
 * API の応答 (中身は未検証) と記事URLから、自動入力する値を作る。
 * 媒体はドメインで決まるので、取得に失敗しても入れる。取れなかった項目は含めない。
 */
export function toAutofillValues(
  articleUrl: string,
  metadata: unknown,
): AutofillValues {
  const values: AutofillValues = {};
  if (metadata && typeof metadata === "object") {
    const record = metadata as Record<string, unknown>;
    for (const key of [
      "thumbnailUrl",
      "title",
      "description",
      "publishedAt",
    ] as const) {
      const value = record[key];
      if (typeof value === "string" && value !== "") values[key] = value;
    }
  }
  const platform = detectBlogPlatform(articleUrl);
  if (platform) values.platformPreset = platform;
  return values;
}

/**
 * 自動入力の値をフォームに入れる。
 * overwrite が false なら空欄にだけ入れる (手で入れた値を消さない)。
 * 戻り値の filled は実際に入れた値で、あとで「自動で入れた値か」を見分けるのに使う。
 */
export function applyAutofill<T extends AutofillForm>(
  form: T,
  values: AutofillValues,
  overwrite: boolean,
): { form: T; filled: AutofillValues } {
  const next = { ...form };
  const filled: AutofillValues = {};
  for (const key of AUTOFILL_KEYS) {
    const value = values[key];
    if (value === undefined) continue;
    if (!overwrite && form[key] !== "") continue;
    next[key] = value as T[AutofillKey];
    filled[key] = value;
  }
  return { form: next, filled };
}

/**
 * 記事URLを変えたとき、前の記事から自動で入れたままの欄を空に戻す。
 * 自動入力のあとに書き換えた欄は、手で入れた値として残す。
 */
export function clearAutofilled<T extends AutofillForm>(
  form: T,
  filled: AutofillValues,
): T {
  const next = { ...form };
  for (const key of AUTOFILL_KEYS) {
    if (filled[key] !== undefined && form[key] === filled[key]) {
      next[key] = "" as T[AutofillKey];
    }
  }
  return next;
}
