import { describe, it, expect, vi } from "vitest";
import {
  detectBlogPlatform,
  extractMediumRssMetadata,
  extractOgpMetadata,
  fetchBlogMetadata,
  resolveMetadataSource,
  supportsMetadataAutofill,
  toJstDate,
} from "./blog-metadata";

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

describe("toJstDate", () => {
  it("タイムゾーン付きの日時を日本時間の日付にする", () => {
    expect(toJstDate("2026-10-20T09:30:35.000+09:00")).toBe("2026-10-20");
    // UTC で前日の 15:00 以降は、日本時間では翌日
    expect(toJstDate("2021-10-19T16:08:17Z")).toBe("2021-10-20");
    expect(toJstDate("Tue, 19 Oct 2021 14:59:59 GMT")).toBe("2021-10-19");
  });

  it("読めない値・空は null", () => {
    expect(toJstDate("not a date")).toBe(null);
    expect(toJstDate("")).toBe(null);
    expect(toJstDate(undefined)).toBe(null);
  });
});

describe("extractOgpMetadata", () => {
  it("Qiita のページから各項目を取り出し、タイトル末尾の「 - Qiita」を落とす", () => {
    const html = `<head>
      <meta property="og:title" content="「はい、承知いたしました」で始まる技術記事 - Qiita">
      <meta property="og:description" content="はじめに サークル内で &amp; 調査しました">
      <meta content="Qiita" property="og:site_name" />
      <meta property="og:image" content="https://img.example/a.png?w=1&amp;h=2">
      <script type="application/ld+json">{"@type":"Article","datePublished":"2026-10-20T09:30:35.000+09:00"}</script>
    </head>`;
    expect(extractOgpMetadata(html)).toEqual({
      thumbnailUrl: "https://img.example/a.png?w=1&h=2",
      title: "「はい、承知いたしました」で始まる技術記事",
      description: "はじめに サークル内で & 調査しました",
      publishedAt: "2026-10-20",
    });
  });

  it("Zenn のように説明・公開日が無い項目は null", () => {
    const html = `<meta property="og:title" content="ZennのMarkdown記法一覧" data-next-head=""/><meta property="og:site_name" content="Zenn"/><meta property="og:image" content="https://res.cloudinary.com/zenn/x.png"/>`;
    expect(extractOgpMetadata(html)).toEqual({
      thumbnailUrl: "https://res.cloudinary.com/zenn/x.png",
      title: "ZennのMarkdown記法一覧",
      description: null,
      publishedAt: null,
    });
  });

  it("タイトル本文の「 - 」や、媒体名と違う接尾辞は残す", () => {
    expect(
      extractOgpMetadata(
        `<meta property="og:title" content="A - B - Qiita"><meta property="og:site_name" content="Qiita">`,
      ).title,
    ).toBe("A - B");
    expect(
      extractOgpMetadata(
        `<meta property="og:title" content="A - Zenn"><meta property="og:site_name" content="Qiita">`,
      ).title,
    ).toBe("A - Zenn");
    // タイトルが接尾辞だけなら落とさない
    expect(
      extractOgpMetadata(
        `<meta property="og:title" content=" - Qiita"><meta property="og:site_name" content="Qiita">`,
      ).title,
    ).toBe("- Qiita");
  });

  it("JSON-LD が無ければ article:published_time を使う", () => {
    expect(
      extractOgpMetadata(
        `<meta property="article:published_time" content="2020-09-06T21:51:55+09:00">`,
      ).publishedAt,
    ).toBe("2020-09-06");
  });

  it("content が先・シングルクォート・name 属性・大文字でも取り出せる", () => {
    expect(
      extractOgpMetadata(
        `<META content='https://img.example/b.png' name='OG:IMAGE' />`,
      ).thumbnailUrl,
    ).toBe("https://img.example/b.png");
  });

  it("og:image:width など別のキーには反応しない", () => {
    const html = `<meta property="og:image:width" content="1200"><meta property="og:image" content="https://img.example/c.png">`;
    expect(extractOgpMetadata(html).thumbnailUrl).toBe(
      "https://img.example/c.png",
    );
  });

  it("相対 URL や javascript: の画像は採用せず、次の候補を探す", () => {
    const html = `<meta property="og:image" content="/relative.png"><meta property="og:image" content="javascript:alert(1)"><meta property="og:image" content="https://img.example/d.png">`;
    expect(extractOgpMetadata(html).thumbnailUrl).toBe(
      "https://img.example/d.png",
    );
  });

  it("空白だけの値は null、何も無いページは全項目 null", () => {
    expect(
      extractOgpMetadata(`<meta property="og:title" content="   ">`).title,
    ).toBe(null);
    expect(extractOgpMetadata("")).toEqual({
      thumbnailUrl: null,
      title: null,
      description: null,
      publishedAt: null,
    });
  });
});

function rssItem(postId: string, content: string, title = "記事タイトル") {
  return `<item><title><![CDATA[${title}]]></title><guid isPermaLink="false">https://medium.com/p/${postId}</guid><pubDate>Tue, 19 Oct 2021 16:08:17 GMT</pubDate><content:encoded><![CDATA[${content}]]></content:encoded></item>`;
}

describe("extractMediumRssMetadata", () => {
  const rss = `<rss><channel>${rssItem("aaaaaaaaaaaa", `<img src="https://cdn-images-1.medium.com/max/1024/other.png">`, "別の記事")}${rssItem("1a2b3c4d5e6f", `<p>本文</p><img alt="" src="https://cdn-images-1.medium.com/max/1024/target.jpeg"><img src="https://cdn-images-1.medium.com/max/1024/second.png">`, "Node.js 17 is here!")}</channel></rss>`;

  it("guid が一致する記事のタイトル・公開日 (日本時間)・最初の画像を返す", () => {
    expect(extractMediumRssMetadata(rss, "1a2b3c4d5e6f")).toEqual({
      thumbnailUrl: "https://cdn-images-1.medium.com/max/1024/target.jpeg",
      title: "Node.js 17 is here!",
      description: null,
      publishedAt: "2021-10-20",
    });
  });

  it("CDATA で包まれていないタイトルの実体参照も戻す", () => {
    const item = `<item><title>A &amp; B</title><guid>https://medium.com/p/1a2b3c4d5e6f</guid></item>`;
    expect(extractMediumRssMetadata(item, "1a2b3c4d5e6f")?.title).toBe("A & B");
  });

  it("閲覧計測用の画像は飛ばし、画像が無ければ thumbnailUrl だけ null", () => {
    const withStat = rssItem(
      "1a2b3c4d5e6f",
      `<img src="https://medium.com/_/stat?event=post.clientViewed&amp;postId=1a2b3c4d5e6f">`,
    );
    expect(extractMediumRssMetadata(withStat, "1a2b3c4d5e6f")).toEqual({
      thumbnailUrl: null,
      title: "記事タイトル",
      description: null,
      publishedAt: "2021-10-20",
    });
  });

  it("RSS に記事が無い (古い記事) ときは null", () => {
    expect(extractMediumRssMetadata(rss, "ffffffffffff")).toBe(null);
    expect(extractMediumRssMetadata("", "1a2b3c4d5e6f")).toBe(null);
  });
});

function htmlResponse(body: string, status = 200) {
  return new Response(body, { status });
}

function redirectResponse(location: string) {
  return new Response(null, { status: 301, headers: { location } });
}

const OGP_HTML = `<meta property="og:image" content="https://img.example/qiita.png"><meta property="og:title" content="記事">`;

describe("fetchBlogMetadata", () => {
  it("Qiita の記事ページから取得する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(OGP_HTML));
    expect(await fetchBlogMetadata(QIITA_URL, fetchMock)).toEqual({
      thumbnailUrl: "https://img.example/qiita.png",
      title: "記事",
      description: null,
      publishedAt: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe(QIITA_URL);
    expect(init.redirect).toBe("manual");
  });

  it("Medium は RSS を取得して該当記事を返す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        htmlResponse(
          rssItem(
            "1a2b3c4d5e6f",
            `<img src="https://cdn-images-1.medium.com/x.png">`,
          ),
        ),
      );
    expect(await fetchBlogMetadata(MEDIUM_URL, fetchMock)).toMatchObject({
      thumbnailUrl: "https://cdn-images-1.medium.com/x.png",
      title: "記事タイトル",
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://medium.com/feed/@someone",
    );
  });

  it("対応外の媒体ではリクエストしない", async () => {
    const fetchMock = vi.fn();
    expect(await fetchBlogMetadata("https://example.com/post", fetchMock)).toBe(
      null,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("許可ホスト内のリダイレクト (相対 Location を含む) は追う", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse("/Tivo0921/items/new"))
      .mockResolvedValueOnce(htmlResponse(OGP_HTML));
    expect((await fetchBlogMetadata(QIITA_URL, fetchMock))?.title).toBe("記事");
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://qiita.com/Tivo0921/items/new",
    );
  });

  it("許可ホスト外・http へのリダイレクトはその先へリクエストしない", async () => {
    for (const location of [
      "http://169.254.169.254/latest/meta-data/",
      "https://internal.example/",
      "http://qiita.com/a",
    ]) {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse(location));
      expect(await fetchBlogMetadata(QIITA_URL, fetchMock)).toBe(null);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("リダイレクトが上限 (3 回) を超えたら打ち切る", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => redirectResponse("/loop"));
    expect(await fetchBlogMetadata(QIITA_URL, fetchMock)).toBe(null);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("Location の無いリダイレクト・エラーステータスは null", async () => {
    expect(
      await fetchBlogMetadata(
        QIITA_URL,
        vi.fn().mockResolvedValue(new Response(null, { status: 302 })),
      ),
    ).toBe(null);
    expect(
      await fetchBlogMetadata(
        QIITA_URL,
        vi.fn().mockResolvedValue(htmlResponse("Forbidden", 403)),
      ),
    ).toBe(null);
  });

  it("通信エラー・タイムアウトは例外にせず null", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await fetchBlogMetadata(
        QIITA_URL,
        vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
      ),
    ).toBe(null);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("本文が 2MB を超えたら読むのをやめて null", async () => {
    const huge = "a".repeat(2 * 1024 * 1024 + 1) + OGP_HTML;
    expect(
      await fetchBlogMetadata(
        QIITA_URL,
        vi.fn().mockResolvedValue(htmlResponse(huge)),
      ),
    ).toBe(null);
  });
});
