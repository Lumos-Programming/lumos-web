import { describe, it, expect } from "vitest";
import {
  BLOG_ERROR_CODES,
  BLOG_ERROR_RESPONSES,
  BLOG_PLATFORM_OTHER,
  BLOG_SHARE_PARAM,
  blogCardElementId,
  blogSharePath,
  parseSharedBlogId,
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
    expect(getPlatformBadgeClass("Qiita")).toBe("bg-[#54C500] text-white");
    expect(getPlatformBadgeClass("Zenn")).toBe("bg-[#3C83F6] text-white");
    expect(getPlatformBadgeClass("Medium")).toBe("bg-[#1D1D1D] text-white");
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

describe("blogSharePath", () => {
  it("ブログ一覧に記事 ID をクエリで付けたパスを作る", () => {
    expect(blogSharePath("abc123")).toBe(`/blogs?${BLOG_SHARE_PARAM}=abc123`);
  });

  it("クエリに使えない文字はエスケープし、URL として読み戻すと元の ID になる", () => {
    const path = blogSharePath("a&b?c#d e");
    const url = new URL(path, "https://lumos-ynu.jp");
    expect(url.pathname).toBe("/blogs");
    expect(url.hash).toBe("");
    expect(url.searchParams.get(BLOG_SHARE_PARAM)).toBe("a&b?c#d e");
    expect(parseSharedBlogId(url.searchParams.get(BLOG_SHARE_PARAM)!)).toBe(
      "a&b?c#d e",
    );
  });
});

describe("blogCardElementId", () => {
  it("記事 ID ごとに別の DOM id を作る", () => {
    expect(blogCardElementId("abc")).toBe("blog-abc");
    expect(blogCardElementId("abc")).not.toBe(blogCardElementId("abd"));
  });
});

describe("parseSharedBlogId", () => {
  it("文字列の ID はそのまま返す", () => {
    expect(parseSharedBlogId("abc123")).toBe("abc123");
  });

  it("同じキーが複数あるときは先頭を使う", () => {
    expect(parseSharedBlogId(["first", "second"])).toBe("first");
  });

  it("未指定・空文字・空配列は null", () => {
    expect(parseSharedBlogId(undefined)).toBeNull();
    expect(parseSharedBlogId("")).toBeNull();
    expect(parseSharedBlogId([])).toBeNull();
  });

  it("Firestore の ID として使えるかはここでは判定しない (getPublicBlog 側でまとめて弾く)", () => {
    expect(parseSharedBlogId("a/b")).toBe("a/b");
    expect(parseSharedBlogId(["..", "ok"])).toBe("..");
  });
});

describe("buildXShareUrl", () => {
  // 実際に共有される URL (/blogs?post=<id>) と同じ形で確認する
  const shareUrl = `https://lumos-ynu.jp${blogSharePath("abc")}`;

  it("本文と URL をクエリに入れた X の投稿画面の URL を作る", () => {
    const url = new URL(buildXShareUrl("記事タイトル", shareUrl));
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe("記事タイトル");
    expect(url.searchParams.get("url")).toBe(shareUrl);
  });

  it("& や # を含むタイトルでもクエリが壊れない", () => {
    const url = new URL(buildXShareUrl("A & B #tag ?q=1", shareUrl));
    expect(url.searchParams.get("text")).toBe("A & B #tag ?q=1");
    expect([...url.searchParams.keys()]).toEqual(["text", "url"]);
  });

  it("クエリを含む共有 URL も url パラメータの中で壊れない", () => {
    const url = new URL(buildXShareUrl("記事タイトル", shareUrl));
    expect(url.searchParams.get("url")).toBe(
      "https://lumos-ynu.jp/blogs?post=abc",
    );
    // post が intent URL 側のパラメータとして漏れていないこと
    expect([...url.searchParams.keys()]).toEqual(["text", "url"]);
  });

  it("記号を含む記事 ID の共有 URL も元に戻せる", () => {
    const tricky = `https://lumos-ynu.jp${blogSharePath("a&b=c#d")}`;
    const url = new URL(buildXShareUrl("t", tricky));
    expect(url.searchParams.get("url")).toBe(tricky);
    const inner = new URL(url.searchParams.get("url")!);
    expect(inner.searchParams.get("post")).toBe("a&b=c#d");
  });
});
