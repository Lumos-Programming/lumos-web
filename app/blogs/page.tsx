import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getPublicBlog, listPublicBlogs } from "@/lib/blogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BlogShareButtons } from "@/components/blogs/blog-share-buttons";
import { ScrollToBlogCard } from "@/components/blogs/scroll-to-blog-card";
import { cn } from "@/lib/utils";
import {
  BLOG_SHARE_PARAM,
  blogCardElementId,
  blogSharePath,
  getPlatformBadgeClass,
  parseSharedBlogId,
} from "@/types/blog";

const SITE_URL = "https://lumos-ynu.jp";
const DEFAULT_OGP_IMAGE = `${SITE_URL}/assets/LumosOGP.webp`;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 共有 URL (/blogs?post=<id>) で開かれたときは、その記事のタイトルとサムネイルを OGP に出す。
 * X などでシェアされたときに記事ごとのカードが表示されるようにするため。
 * それ以外は親 (app/layout.tsx) の既定のままにする
 */
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const sharedId = parseSharedBlogId((await searchParams)[BLOG_SHARE_PARAM]);
  const blog = sharedId ? await getPublicBlog(sharedId) : null;
  if (!blog) return {};

  const title = `${blog.title} | Lumos ブログ`;
  const description =
    blog.description ||
    `${blog.authorName} が書いた記事を Lumos で紹介しています。`;
  const image = blog.thumbnailUrl || DEFAULT_OGP_IMAGE;

  // openGraph / twitter は親と浅くマージされ、丸ごと置き換わる。siteName などもここで持ち直す
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      siteName: "lumosweb",
      url: `${SITE_URL}${blogSharePath(blog.id)}`,
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

export default async function BlogsPage({ searchParams }: Props) {
  // 著者名の公開可否と退会済みの除外は listPublicBlogs が持っている
  const blogs = await listPublicBlogs();
  const sharedId = parseSharedBlogId((await searchParams)[BLOG_SHARE_PARAM]);
  // 一覧に無い ID (削除済み・退会済みの著者) は強調せず、普通の一覧として見せる
  const highlightedId =
    sharedId && blogs.some((blog) => blog.id === sharedId) ? sharedId : null;

  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">
              ブログ
            </h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosのメンバーが外部に書いた記事を紹介します。
            </p>
          </div>
        </div>
      </section>

      {/* Blog Cards */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          {highlightedId && <ScrollToBlogCard blogId={highlightedId} />}
          {blogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              まだ記事がありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => {
                const highlighted = blog.id === highlightedId;
                return (
                  // カード全体はリンクにしない (スマホでスクロール中に誤タップしやすいため)。
                  // 元記事へはボタンで飛ばす
                  <Card
                    key={blog.id}
                    id={blogCardElementId(blog.id)}
                    className={cn(
                      "h-full flex flex-col overflow-hidden transition-all duration-300 border-border bg-card",
                      highlighted &&
                        "ring-4 ring-primary ring-offset-4 ring-offset-background shadow-lg",
                    )}
                  >
                    <div className="aspect-video relative bg-muted">
                      <Image
                        src={blog.thumbnailUrl || "/placeholder.svg"}
                        alt={blog.title}
                        fill
                        className="object-cover"
                      />
                      {blog.platform && (
                        <div className="absolute top-4 left-4">
                          <span
                            className={cn(
                              // inline のままだと背景ボックスの高さがフォントの
                              // ascent/descent で決まり、文字が上下中央に見えない
                              "inline-flex items-center text-xs font-medium px-2 py-1 rounded-full",
                              getPlatformBadgeClass(blog.platform),
                            )}
                          >
                            {blog.platform}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <p className="text-sm font-semibold text-gradient-orange mb-2">
                        {blog.publishedAt}
                      </p>
                      <h3 className="text-xl font-bold mb-2 text-foreground">
                        {blog.title}
                      </h3>
                      {blog.description && (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {blog.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-auto mb-4">
                        {blog.authorName}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <a
                            href={blog.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            記事を読む
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                        <BlogShareButtons
                          blogId={blog.id}
                          title={blog.title}
                          size="sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
