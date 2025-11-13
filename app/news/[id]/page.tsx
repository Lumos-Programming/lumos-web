"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { newsService } from "@/lib/content";
import { NewsItemData } from "@/types/content";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<NewsItemData | null>(null);

  useEffect(() => {
    const id = params?.id;

    if (!id) return;

    // if id can be string | string[], handle that:
    const normalizedId = Array.isArray(id) ? id[0] : id;

    newsService.getById(normalizedId).then((article) => {
      setArticle(article);
    });
  }, [params]);

  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/news"
              className="inline-flex items-center text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              お知らせ一覧に戻る
            </Link>

            {article && (
              <>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {article.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {article.date}
                  </div>
                  <div className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    <span className="bg-accent/20 text-white px-2 py-0.5 rounded-full">
                      {article.category}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          {article && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-8 rounded-lg overflow-hidden">
                <Image
                  src={article.image || "/placeholder.svg"}
                  alt={article.title}
                  width={1200}
                  height={600}
                  className="w-full object-contain max-h-96"
                />
              </div>

              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              <div className="mt-12 pt-8 border-t">
                <Button asChild variant="outline">
                  <Link href="/news">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    お知らせ一覧に戻る
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
