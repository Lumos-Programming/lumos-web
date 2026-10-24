import { describe, it, expect } from "vitest";
import {
  applyAutofill,
  clearAutofilled,
  toAutofillValues,
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
