import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlogShareButtons } from "@/components/blogs/blog-share-buttons";
import { getPublicBlog } from "@/lib/blogs";
import { cn } from "@/lib/utils";
import { blogDetailPath, getPlatformBadgeClass } from "@/types/blog";

// 記事は WebUI からいつでも増えるので、ビルド時に URL を固定しない。
// Firestore はビルド環境から到達できないため、リクエスト時に取得する。
export const dynamic = "force-dynamic";

const SITE_URL = "https://lumos-ynu.jp";
const DEFAULT_OGP_IMAGE = `${SITE_URL}/assets/LumosOGP.webp`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const blog = await getPublicBlog(id);
  if (!blog) return { title: "記事が見つかりません" };

  const title = `${blog.title} | Lumos ブログ`;
  const description =
    blog.description ||
    `${blog.authorName} が書いた記事を Lumos で紹介しています。`;
  const image = blog.thumbnailUrl || DEFAULT_OGP_IMAGE;

  // openGraph / twitter は親 (app/layout.tsx) と浅くマージされ、丸ごと置き換わる。
  // siteName などもここで持ち直す
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      siteName: "lumosweb",
      url: `${SITE_URL}${blogDetailPath(blog.id)}`,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 著者名の公開可否と退会済みの除外は getPublicBlog が持っている
  const blog = await getPublicBlog(id);

  if (!blog) {
    notFound();
  }

  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/blogs"
              className="inline-flex items-center text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              ブログ一覧に戻る
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              {blog.platform && (
                <span
                  className={cn(
                    "inline-flex items-center text-xs font-medium px-2 py-1 rounded-full",
                    getPlatformBadgeClass(blog.platform),
                  )}
                >
                  {blog.platform}
                </span>
              )}
              <span>{blog.publishedAt}</span>
              <span>{blog.authorName}</span>
            </div>
            <h1 className="animate-fade-in-up text-2xl md:text-4xl font-bold break-words">
              {blog.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Article Summary */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="aspect-video relative bg-muted rounded-lg overflow-hidden mb-8">
              <Image
                src={blog.thumbnailUrl || "/placeholder.svg"}
                alt={blog.title}
                fill
                className="object-cover"
              />
            </div>

            {blog.description && (
              <p className="text-lg text-muted-foreground mb-8 whitespace-pre-wrap break-words">
                {blog.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button asChild size="lg">
                <a href={blog.url} target="_blank" rel="noopener noreferrer">
                  記事を読む
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <BlogShareButtons blogId={blog.id} title={blog.title} />
            </div>

            {/* 記事を読みに来た人に Lumos 自体も見てもらうための導線 */}
            <div className="mt-16 pt-8 border-t">
              <h2 className="text-xl font-bold mb-2">Lumos について</h2>
              <p className="text-muted-foreground mb-6">
                Lumos
                は横浜国立大学のプログラミングサークルです。この記事はメンバーが外部に書いたものを紹介しています。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/about">Lumosとは</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/members">メンバー紹介</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/blogs">ほかの記事を見る</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
