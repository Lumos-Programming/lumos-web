/**
 * 記事登録フォームの自動入力。取得した値をどの欄に入れるか / いつ消すかを決める。
 * フォームの state を直接触らない純粋関数にして、コンポーネントから呼ぶ。
 */

import { detectBlogPlatform, supportsMetadataAutofill } from "@/lib/blog-url";

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

/** 記事情報の自動取得の状態。notFound のときは手動入力を促す */
export type AutofillStatus = "idle" | "loading" | "notFound";

/** 記事URLの欄を含むフォーム */
type AutofillTarget = AutofillForm & { url: string };

export interface AutofillState<T extends AutofillTarget> {
  form: T;
  /** 自動で入れた値。手で入れた値と見分けて、記事URLを変えたときに消すのに使う */
  autoFilled: AutofillValues;
  status: AutofillStatus;
  /** 最後に取得を終えた記事URL。同じURLで blur し直しても取り直さないために持つ */
  fetchedUrl: string | null;
  /** 結果を待っている取得。これと違う取得の結果は古いものとして捨てる */
  pendingRequestId: number | null;
}

export type AutofillAction<T extends AutofillTarget> =
  /** 編集の開始・終了や登録後に、フォームを入れ替える */
  | { type: "reset"; form: T }
  /** 記事URL以外の欄を手で書き換えた */
  | { type: "fieldsChanged"; fields: Partial<Omit<T, "url">> }
  | { type: "urlChanged"; url: string }
  | { type: "fetchStarted"; requestId: number }
  | {
      type: "fetchFinished";
      requestId: number;
      /** API の応答の metadata (中身は未検証)。取れなかったときは null */
      metadata: unknown;
      overwrite: boolean;
    };

export function initialAutofillState<T extends AutofillTarget>(
  form: T,
): AutofillState<T> {
  return {
    form,
    autoFilled: {},
    status: "idle",
    fetchedUrl: null,
    pendingRequestId: null,
  };
}

/**
 * 記事登録フォームの値と、自動入力の状態をまとめて更新する。
 * 取得の開始と終了を別の action にして、途中で URL が変わったときは古い結果を捨てる。
 */
export function autofillReducer<T extends AutofillTarget>(
  state: AutofillState<T>,
  action: AutofillAction<T>,
): AutofillState<T> {
  switch (action.type) {
    case "reset":
      return initialAutofillState(action.form);
    case "fieldsChanged":
      return { ...state, form: { ...state.form, ...action.fields } };
    case "urlChanged":
      // 自動で入れた値は前の記事のものなので消す。手で入れた値は残す
      return initialAutofillState(
        clearAutofilled({ ...state.form, url: action.url }, state.autoFilled),
      );
    case "fetchStarted":
      return {
        ...state,
        status: "loading",
        pendingRequestId: action.requestId,
      };
    case "fetchFinished": {
      if (action.requestId !== state.pendingRequestId) return state;
      const values = toAutofillValues(state.form.url, action.metadata);
      const result = applyAutofill(state.form, values, action.overwrite);
      return {
        form: result.form,
        // 今回入れなかった欄も、前に自動で入れた値なら記録を残す
        autoFilled: { ...state.autoFilled, ...result.filled },
        status: action.metadata ? "idle" : "notFound",
        fetchedUrl: state.form.url,
        pendingRequestId: null,
      };
    }
  }
}

/** 記事URLの欄から離れたときに取得するか。取得中や、取得済みの URL では取り直さない */
export function shouldFetchOnBlur<T extends AutofillTarget>(
  state: AutofillState<T>,
): boolean {
  return (
    state.pendingRequestId === null &&
    state.fetchedUrl !== state.form.url &&
    supportsMetadataAutofill(state.form.url)
  );
}
