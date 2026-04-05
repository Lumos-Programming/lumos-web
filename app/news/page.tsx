import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { newsArticles } from "./news-data";

// 日本語の日付文字列をYYYYMMDD形式の数値に変換してソート
const parseJapaneseDate = (dateStr: string): number => {
  const match = dateStr.match(/(\d+)年(\d+)月(\d+)?/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3] ? match[3].padStart(2, "0") : "15"; // "中" などの曖昧な表記は15とする
    return Number(`${year}${month}${day}`);
  }
  return 0;
};

const sortedNewsArticles = [...newsArticles].sort(
  (a, b) => parseJapaneseDate(b.date) - parseJapaneseDate(a.date),
);

export default function NewsPage() {
  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">
              お知らせ
            </h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosの活動やイベント情報についてお知らせします。
            </p>
          </div>
        </div>
      </section>

      {/* News Articles */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedNewsArticles.map((article) => (
              <Card
                key={article.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card"
              >
                <div className="aspect-video relative">
                  <Image
                    src={article.image || "/placeholder.svg"}
                    alt={article.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-gradient-orange text-white text-xs font-medium px-2 py-1 rounded-full">
                      {article.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-gradient-orange mb-2">
                    {article.date}
                  </p>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {article.summary}
                  </p>
                  <Link
                    href={`/news/${article.id}`}
                    className="text-accent-foreground hover:text-accent-foreground/80 font-medium inline-flex items-center transition-colors"
                  >
                    詳細を見る
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
