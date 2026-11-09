import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogThumbnail, shouldShowFallback } from "./blog-thumbnail";

describe("shouldShowFallback", () => {
  it("画像が無ければ既定表示にする", () => {
    expect(shouldShowFallback(undefined, null)).toBe(true);
    expect(shouldShowFallback("", null)).toBe(true);
  });

  it("読み込みに失敗した URL なら既定表示にする", () => {
    expect(
      shouldShowFallback("https://a.test/x.png", "https://a.test/x.png"),
    ).toBe(true);
  });

  it("失敗したのが別の URL なら、新しい URL は読み込みを試す", () => {
    expect(
      shouldShowFallback("https://a.test/new.png", "https://a.test/old.png"),
    ).toBe(false);
  });

  it("失敗していなければ画像を表示する", () => {
    expect(shouldShowFallback("https://a.test/x.png", null)).toBe(false);
  });
});

describe("BlogThumbnail", () => {
  it("画像が無いときはタイトル入りの既定表示を出す", () => {
    const html = renderToStaticMarkup(
      <BlogThumbnail title="記事 <タイトル>" />,
    );
    expect(html).toContain('data-testid="blog-thumbnail-fallback"');
    // タイトルは文字列としてエスケープされる
    expect(html).toContain("記事 &lt;タイトル&gt;");
    expect(html).not.toContain("<img");
  });

  it("画像があるときは img を出し、既定表示は出さない", () => {
    const html = renderToStaticMarkup(
      <BlogThumbnail src="https://a.test/x.png" title="記事" />,
    );
    expect(html).toContain("<img");
    // テスト環境では next/image が最適化用の URL に変換するので、エンコード後も許容する
    expect(html).toMatch(/a\.test(%2F|\/)x\.png/);
    expect(html).not.toContain("blog-thumbnail-fallback");
  });
});
