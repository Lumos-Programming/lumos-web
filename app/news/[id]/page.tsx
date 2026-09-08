import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import {
  NewsArticleBody,
  NewsArticleHeader,
} from "@/components/news/news-article-view";
import { getPublishedNewsArticleWithFallback } from "@/lib/news";

// 記事は WebUI からいつでも増えるので、ビルド時に URL を固定しない。
// Firestore はビルド環境から到達できないため、リクエスト時に取得する。
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getPublishedNewsArticleWithFallback(id);
  return {
    title: article?.title || "ニュース詳細",
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getPublishedNewsArticleWithFallback(id);

  if (!article) {
    notFound();
  }

  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <NewsArticleHeader article={article}>
            <Link
              href="/news"
              className="inline-flex items-center text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              お知らせ一覧に戻る
            </Link>
          </NewsArticleHeader>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <NewsArticleBody article={article} />

            <div className="mt-12 pt-8 border-t">
              <Button asChild variant="outline">
                <Link href="/news">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  お知らせ一覧に戻る
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
