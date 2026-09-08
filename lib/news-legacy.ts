import { newsArticles } from "@/app/news/news-data";
import type { NewsArticle } from "@/types/news";

/**
 * Firestore へ移行する前のお知らせ (app/news/news-data.ts) を NewsArticle に変換する。
 *
 * Firestore が空の間も公開ページが従来どおり出るように、公開ページはこれをフォールバックに使う。
 * 移行スクリプト (scripts/migrate-news.ts) を本番で流し終えたら、
 * news-data.ts ごとこのファイルも消せる。
 */

/**
 * "2025年12月11日" / "2025年5月21-23日" / "2025年4月中" を並べ替え用の Date にする。
 * 日が読み取れない曖昧な表記 ("4月中" など) は、従来の一覧の並びを保つために 15 日として扱う。
 */
export function parseJapaneseNewsDate(dateStr: string): Date | null {
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(?:(\d{1,2}))?/);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(
    `${year}-${month.padStart(2, "0")}-${(day ?? "15").padStart(2, "0")}T00:00:00+09:00`,
  );
}

/**
 * 旧データの本文は <p> タグだけで書かれている。本文は Markdown で持つことにしたので、
 * 段落を空行区切りのテキストに開く。
 */
export function legacyHtmlToMarkdown(html: string): string {
  return html
    .split(/<\/p>/i)
    .map((chunk) => chunk.replace(/<p[^>]*>/i, "").trim())
    .filter((chunk) => chunk !== "")
    .join("\n\n");
}

export const LEGACY_NEWS_ARTICLES: NewsArticle[] = newsArticles.map(
  (article) => {
    const publishedAt = parseJapaneseNewsDate(article.date);
    return {
      id: String(article.id),
      date: article.date,
      title: article.title,
      summary: article.summary,
      body: legacyHtmlToMarkdown(article.content),
      image: article.image,
      category: article.category,
      status: "published",
      publishedAt: publishedAt ? publishedAt.toISOString() : null,
      // 旧データに執筆者の記録は無い
      authorId: "",
      createdAt: null,
      updatedAt: null,
    };
  },
);
