import { describe, it, expect } from "vitest";
import {
  applyAutofill,
  autofillReducer,
  clearAutofilled,
  initialAutofillState,
  shouldFetchOnBlur,
  toAutofillValues,
  type AutofillAction,
  type AutofillState,
} from "./blog-autofill";

const QIITA_URL = "https://qiita.com/Tivo0921/items/75a7375eeefe6853cf3e";

const EMPTY = {
  url: QIITA_URL,
  title: "",
  description: "",
  thumbnailUrl: "",
  publishedAt: "",
  platformPreset: "",
  platformOther: "",
};

describe("toAutofillValues", () => {
  it("取れた項目と、ドメインから決めた媒体を返す", () => {
    expect(
      toAutofillValues(QIITA_URL, {
        thumbnailUrl: "https://img.example/a.png",
        title: "記事",
        description: "冒頭",
        publishedAt: "2026-10-20",
      }),
    ).toEqual({
      thumbnailUrl: "https://img.example/a.png",
      title: "記事",
      description: "冒頭",
      publishedAt: "2026-10-20",
      platformPreset: "Qiita",
    });
  });

  it("null・空文字・文字列以外の項目は含めない", () => {
    expect(
      toAutofillValues(QIITA_URL, {
        thumbnailUrl: null,
        title: "",
        description: 123,
        publishedAt: { y: 2026 },
      }),
    ).toEqual({ platformPreset: "Qiita" });
  });

  it("取得に失敗しても (metadata が null や不正な値) 媒体だけは返す", () => {
    expect(toAutofillValues(QIITA_URL, null)).toEqual({
      platformPreset: "Qiita",
    });
    expect(toAutofillValues(QIITA_URL, "oops")).toEqual({
      platformPreset: "Qiita",
    });
  });

  it("対応外の媒体なら空", () => {
    expect(toAutofillValues("https://example.com/a", null)).toEqual({});
  });
});

describe("applyAutofill", () => {
  const values = {
    title: "記事",
    description: "冒頭",
    platformPreset: "Qiita",
  };

  it("空欄に入れ、入れた値を filled で返す。ほかの欄はそのまま", () => {
    const { form, filled } = applyAutofill(EMPTY, values, false);
    expect(form).toEqual({ ...EMPTY, ...values });
    expect(filled).toEqual(values);
  });

  it("overwrite が false なら、入力済みの欄は上書きしない", () => {
    const { form, filled } = applyAutofill(
      { ...EMPTY, title: "自分で書いたタイトル" },
      values,
      false,
    );
    expect(form.title).toBe("自分で書いたタイトル");
    expect(form.description).toBe("冒頭");
    expect(filled).toEqual({ description: "冒頭", platformPreset: "Qiita" });
  });

  it("overwrite が true なら入力済みの欄も上書きする", () => {
    const { form } = applyAutofill(
      { ...EMPTY, title: "自分で書いたタイトル" },
      values,
      true,
    );
    expect(form.title).toBe("記事");
  });

  it("取れなかった項目は、overwrite でも消さない", () => {
    const { form } = applyAutofill(
      { ...EMPTY, thumbnailUrl: "https://img.example/mine.png" },
      values,
      true,
    );
    expect(form.thumbnailUrl).toBe("https://img.example/mine.png");
  });

  it("元のフォームは書き換えない", () => {
    const original = { ...EMPTY };
    applyAutofill(original, values, true);
    expect(original).toEqual(EMPTY);
  });
});

describe("clearAutofilled", () => {
  it("自動で入れたままの欄だけ空に戻し、書き換えた欄は残す", () => {
    const form = {
      ...EMPTY,
      url: "https://zenn.dev/a/articles/b",
      title: "記事",
      description: "書き換えた説明",
      platformPreset: "Qiita",
    };
    expect(
      clearAutofilled(form, {
        title: "記事",
        description: "冒頭",
        platformPreset: "Qiita",
      }),
    ).toEqual({
      ...form,
      title: "",
      description: "書き換えた説明",
      platformPreset: "",
    });
  });

  it("自動で入れていない欄は、値が同じでも消さない", () => {
    const form = { ...EMPTY, title: "記事" };
    expect(clearAutofilled(form, {})).toEqual(form);
  });
});

describe("autofillReducer", () => {
  type Form = typeof EMPTY;
  const ZENN_URL = "https://zenn.dev/a/articles/b";
  const META = {
    thumbnailUrl: "https://img.example/a.png",
    title: "記事",
    description: "冒頭",
    publishedAt: "2026-10-20",
  };
  const AUTOFILLED_EMPTY = {
    title: "",
    description: "",
    thumbnailUrl: "",
    publishedAt: "",
    platformPreset: "",
  };

  const run = (...actions: AutofillAction<Form>[]): AutofillState<Form> =>
    actions.reduce(autofillReducer<Form>, initialAutofillState(EMPTY));
  const started = (requestId: number): AutofillAction<Form> => ({
    type: "fetchStarted",
    requestId,
  });
  const finished = (
    requestId: number,
    metadata: unknown = META,
    overwrite = false,
  ): AutofillAction<Form> => ({
    type: "fetchFinished",
    requestId,
    metadata,
    overwrite,
  });
  const urlChanged = (url: string): AutofillAction<Form> => ({
    type: "urlChanged",
    url,
  });
  const typed = (fields: Partial<Form>): AutofillAction<Form> => ({
    type: "fieldsChanged",
    fields,
  });

  describe("shouldFetchOnBlur", () => {
    it("まだ取得していない対応 URL なら取得する", () => {
      expect(shouldFetchOnBlur(run())).toBe(true);
    });

    it("取得済みの URL では、blur し直しても取得しない", () => {
      expect(shouldFetchOnBlur(run(started(1), finished(1)))).toBe(false);
    });

    it("取得できなかった URL でも、blur し直しただけでは取得しない", () => {
      expect(shouldFetchOnBlur(run(started(1), finished(1, null)))).toBe(false);
    });

    it("取得中は取得しない", () => {
      expect(shouldFetchOnBlur(run(started(1)))).toBe(false);
    });

    it("URL を変えたら、また取得する", () => {
      expect(
        shouldFetchOnBlur(run(started(1), finished(1), urlChanged(ZENN_URL))),
      ).toBe(true);
    });

    it("対応していない URL では取得しない", () => {
      expect(shouldFetchOnBlur(run(urlChanged("https://example.com/a")))).toBe(
        false,
      );
    });
  });

  it("取得できた値を空欄に入れ、status を idle に戻す", () => {
    const state = run(started(1), finished(1));
    expect(state.form).toMatchObject({ ...META, platformPreset: "Qiita" });
    expect(state.status).toBe("idle");
  });

  it("取得できなかったときは notFound にし、媒体だけ入れる", () => {
    const state = run(started(1), finished(1, null));
    expect(state.status).toBe("notFound");
    expect(state.form.platformPreset).toBe("Qiita");
  });

  it("同じ URL で取り直したあと URL を変えると、自動で入れた値が消える", () => {
    const state = run(
      started(1),
      finished(1),
      started(2),
      finished(2),
      urlChanged(ZENN_URL),
    );
    expect(state.form).toEqual({
      ...EMPTY,
      url: ZENN_URL,
      ...AUTOFILLED_EMPTY,
    });
  });

  it("一部の欄を消して取り直しても、前に自動で入れた欄の記録は残る", () => {
    const state = run(
      started(1),
      finished(1),
      typed({ title: "" }),
      started(2),
      finished(2),
      urlChanged(ZENN_URL),
    );
    expect(state.form).toEqual({
      ...EMPTY,
      url: ZENN_URL,
      ...AUTOFILLED_EMPTY,
    });
  });

  it("URL を変える前に始めた取得の結果では、フォームが変わらない", () => {
    const state = run(started(1), urlChanged(ZENN_URL), finished(1));
    expect(state.form).toEqual({ ...EMPTY, url: ZENN_URL });
    expect(state.autoFilled).toEqual({});
  });

  it("古い取得が終わっても、新しい取得の途中なら loading のまま", () => {
    const state = run(
      started(1),
      urlChanged(ZENN_URL),
      started(2),
      finished(1, null),
    );
    expect(state.status).toBe("loading");
  });

  it("古い取得の失敗では notFound にならない", () => {
    const state = run(
      started(1),
      urlChanged(ZENN_URL),
      started(2),
      finished(1, null),
      finished(2),
    );
    expect(state.status).toBe("idle");
  });

  it("手で入れた値は、上書きなしの取得では消えない", () => {
    const state = run(typed({ title: "手書き" }), started(1), finished(1));
    expect(state.form.title).toBe("手書き");
    expect(state.form.description).toBe("冒頭");
  });

  it("上書きありの取得では、手で書き換えた欄も取得した値に戻る", () => {
    const state = run(
      started(1),
      finished(1),
      typed({ title: "書き換え" }),
      started(2),
      finished(2, META, true),
    );
    expect(state.form.title).toBe("記事");
    expect(state.autoFilled.title).toBe("記事");
  });

  it("自動で入れたあとに書き換えた欄は、URL を変えても残る", () => {
    const state = run(
      started(1),
      finished(1),
      typed({ title: "書き換え" }),
      urlChanged(ZENN_URL),
    );
    expect(state.form.title).toBe("書き換え");
    expect(state.form.description).toBe("");
  });

  it("reset で自動入力の状態が初期化される", () => {
    const other = { ...EMPTY, url: ZENN_URL, title: "保存済み" };
    const state = autofillReducer(run(started(1), finished(1)), {
      type: "reset",
      form: other,
    });
    expect(state).toEqual(initialAutofillState(other));
  });

  it("reset の前に始めた取得の結果は捨てる", () => {
    const state = run(started(1), { type: "reset", form: EMPTY }, finished(1));
    expect(state.form).toEqual(EMPTY);
    expect(state.status).toBe("idle");
  });
});
