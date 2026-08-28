import { describe, it, expect } from "vitest";
import {
  BLOG_ERROR_CODES,
  BLOG_ERROR_RESPONSES,
  BLOG_PLATFORM_OTHER,
  BlogError,
  toPlatformSelection,
} from "./blog";

describe("toPlatformSelection", () => {
  it("プリセットの媒体はそのまま選択肢として復元する", () => {
    expect(toPlatformSelection("Zenn")).toEqual({ preset: "Zenn", other: "" });
  });

  it("プリセットに無い媒体は「その他」+ 自由記述として復元する", () => {
    expect(toPlatformSelection("はてなブログ")).toEqual({
      preset: BLOG_PLATFORM_OTHER,
      other: "はてなブログ",
    });
  });

  it("未設定はどちらも空にする", () => {
    expect(toPlatformSelection(undefined)).toEqual({ preset: "", other: "" });
    expect(toPlatformSelection("")).toEqual({ preset: "", other: "" });
  });
});

describe("BlogError", () => {
  it("コードを保持し、対応する日本語メッセージを message に持つ", () => {
    const e = new BlogError(BLOG_ERROR_CODES.FORBIDDEN);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe(BLOG_ERROR_CODES.FORBIDDEN);
    expect(e.message).toBe(BLOG_ERROR_RESPONSES.FORBIDDEN.message);
  });

  it("すべてのコードに status とメッセージが定義されている", () => {
    for (const code of Object.values(BLOG_ERROR_CODES)) {
      const res = BLOG_ERROR_RESPONSES[code];
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.message.length).toBeGreaterThan(0);
    }
  });
});
