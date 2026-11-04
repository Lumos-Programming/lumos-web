import { describe, it, expect } from "vitest";
import {
  BLOG_ERROR_CODES,
  BLOG_ERROR_RESPONSES,
  BLOG_PLATFORM_OTHER,
  blogDetailPath,
  buildXShareUrl,
  byPublishedAtDesc,
  getPlatformBadgeClass,
  BlogError,
  toPlatformSelection,
  type Blog,
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

describe("getPlatformBadgeClass", () => {
  it("プリセットの媒体はそれぞれのブランドカラーを返す", () => {
    expect(getPlatformBadgeClass("Qiita")).toBe("bg-[#54C500] text-[#1D1D1D]");
    expect(getPlatformBadgeClass("Zenn")).toBe("bg-[#3C83F6] text-white");
    expect(getPlatformBadgeClass("Medium")).toBe("bg-[#1D1D1D] text-white");
  });

  it("背景が明るい Qiita だけ文字色を濃くする", () => {
    // 白文字だと 2.24:1 しか出ないため
    expect(getPlatformBadgeClass("Qiita")).not.toContain("text-white");
  });

  it("プリセットに無い媒体は既定の色のままにする", () => {
    expect(getPlatformBadgeClass("はてなブログ")).toBe(
      "bg-gradient-orange text-white",
    );
    expect(getPlatformBadgeClass(BLOG_PLATFORM_OTHER)).toBe(
      "bg-gradient-orange text-white",
    );
  });
});

describe("byPublishedAtDesc", () => {
  const blog = (publishedAt: string): Blog => ({
    id: publishedAt,
    authorId: "user-123",
    url: "https://example.com/a",
    title: "記事",
    publishedAt,
    createdAt: 0,
  });

  it("公開日の新しい順に並べる", () => {
    const sorted = [blog("2026-01-15"), blog("2026-08-01"), blog("2026-03-01")]
      .sort(byPublishedAtDesc)
      .map((b) => b.publishedAt);
    expect(sorted).toEqual(["2026-08-01", "2026-03-01", "2026-01-15"]);
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

describe("blogDetailPath", () => {
  it("記事 ID から個別ページのパスを作る", () => {
    expect(blogDetailPath("abc123")).toBe("/blogs/abc123");
  });

  it("パスに使えない文字はエスケープする", () => {
    expect(blogDetailPath("a/b?c#d")).toBe("/blogs/a%2Fb%3Fc%23d");
  });
});

describe("buildXShareUrl", () => {
  it("本文と URL をクエリに入れた X の投稿画面の URL を作る", () => {
    const url = new URL(
      buildXShareUrl("記事タイトル", "https://lumos-ynu.jp/blogs/abc"),
    );
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe("記事タイトル");
    expect(url.searchParams.get("url")).toBe("https://lumos-ynu.jp/blogs/abc");
  });

  it("& や # を含むタイトルでもクエリが壊れない", () => {
    const url = new URL(
      buildXShareUrl("A & B #tag ?q=1", "https://lumos-ynu.jp/blogs/abc"),
    );
    expect(url.searchParams.get("text")).toBe("A & B #tag ?q=1");
    expect([...url.searchParams.keys()]).toEqual(["text", "url"]);
  });
});
