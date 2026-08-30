import Image from "next/image";
import { listPublicBlogs } from "@/lib/blogs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPlatformBadgeClass } from "@/types/blog";

export default async function BlogsPage() {
  // 著者名の公開可否と退会済みの除外は listPublicBlogs が持っている
  const blogs = await listPublicBlogs();

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
          {blogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              まだ記事がありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <a
                  key={blog.id}
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card">
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
                      <p className="text-sm text-muted-foreground mt-auto">
                        {blog.authorName}
                      </p>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
