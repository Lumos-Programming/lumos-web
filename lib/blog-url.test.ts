import { describe, it, expect } from "vitest";
import {
  detectBlogPlatform,
  resolveMetadataSource,
  supportsMetadataAutofill,
} from "./blog-url";

const QIITA_URL = "https://qiita.com/Tivo0921/items/75a7375eeefe6853cf3e";
const MEDIUM_URL = "https://medium.com/@someone/my-first-post-1a2b3c4d5e6f";

describe("resolveMetadataSource", () => {
  it("Qiita / Zenn は記事ページを見る", () => {
    expect(resolveMetadataSource(QIITA_URL)).toEqual({
      kind: "ogp",
      pageUrl: QIITA_URL,
    });
    expect(
      resolveMetadataSource("https://zenn.dev/zenn/articles/markdown-guide"),
    ).toEqual({
      kind: "ogp",
      pageUrl: "https://zenn.dev/zenn/articles/markdown-guide",
    });
  });

  it("Medium の個人記事はユーザーの RSS を見る", () => {
    expect(resolveMetadataSource(MEDIUM_URL)).toEqual({
      kind: "medium-rss",
      feedUrl: "https://medium.com/feed/@someone",
      postId: "1a2b3c4d5e6f",
    });
  });

  it("Medium の publication の記事は publication の RSS を見る (クエリは無視)", () => {
    expect(
      resolveMetadataSource(
        "https://medium.com/the-node-js-collection/node-js-17-is-here-8dba1e14e382?source=rss",
      ),
    ).toEqual({
      kind: "medium-rss",
      feedUrl: "https://medium.com/feed/the-node-js-collection",
      postId: "8dba1e14e382",
    });
  });

  it("Medium のサブドメインの記事はそのサブドメインの RSS を見る", () => {
    expect(
      resolveMetadataSource("https://someone.medium.com/my-post-1a2b3c4d5e6f"),
    ).toEqual({
      kind: "medium-rss",
      feedUrl: "https://someone.medium.com/feed",
      postId: "1a2b3c4d5e6f",
    });
  });

  it("Medium で RSS か記事 ID が決まらない URL は対応外", () => {
    // /p/<ID> だけでは誰の RSS を見ればいいか分からない
    expect(resolveMetadataSource("https://medium.com/p/1a2b3c4d5e6f")).toBe(
      null,
    );
    expect(resolveMetadataSource("https://medium.com/@someone")).toBe(null);
    expect(resolveMetadataSource("https://medium.com/")).toBe(null);
  });

  it("対応外の媒体・紛らわしいホスト・https 以外・URL でない文字列は null", () => {
    expect(resolveMetadataSource("https://note.com/someone/n/abc")).toBe(null);
    expect(resolveMetadataSource("https://qiita.com.evil.example/x")).toBe(
      null,
    );
    expect(resolveMetadataSource("https://evilmedium.com/@a/p-1a2b3c4d")).toBe(
      null,
    );
    expect(resolveMetadataSource("http://qiita.com/a/items/b")).toBe(null);
    expect(resolveMetadataSource("not a url")).toBe(null);
    expect(resolveMetadataSource("")).toBe(null);
  });

  it("supportsMetadataAutofill は resolveMetadataSource の結果と一致する", () => {
    expect(supportsMetadataAutofill(QIITA_URL)).toBe(true);
    expect(supportsMetadataAutofill("https://example.com/post")).toBe(false);
  });
});

describe("detectBlogPlatform", () => {
  it("ドメインから媒体を決める", () => {
    expect(detectBlogPlatform(QIITA_URL)).toBe("Qiita");
    expect(detectBlogPlatform("https://zenn.dev/a/articles/b")).toBe("Zenn");
    expect(detectBlogPlatform(MEDIUM_URL)).toBe("Medium");
    expect(detectBlogPlatform("https://someone.medium.com/x")).toBe("Medium");
    // 記事 ID が取れない Medium の URL でも、媒体は決まる
    expect(detectBlogPlatform("https://medium.com/p/1a2b3c4d5e6f")).toBe(
      "Medium",
    );
  });

  it("対応外・Object のプロパティ名と同じホスト・URL でないものは null", () => {
    expect(detectBlogPlatform("https://note.com/a")).toBe(null);
    expect(detectBlogPlatform("https://constructor/a")).toBe(null);
    expect(detectBlogPlatform("not a url")).toBe(null);
  });
});
