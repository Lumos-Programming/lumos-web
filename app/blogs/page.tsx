import Image from "next/image";
import { listPublishedArticles } from "@/lib/articles";
import { getMember } from "@/lib/members";
import { Card, CardContent } from "@/components/ui/card";

async function resolveAuthorName(authorId: string): Promise<string> {
  const member = await getMember(authorId);
  return member?.nickname || member?.discordUsername || "Lumosメンバー";
}

export default async function BlogsPage() {
  const articles = await listPublishedArticles();
  const uniqueAuthorIds = [...new Set(articles.map((a) => a.authorId))];
  const authorNames = new Map(
    await Promise.all(
      uniqueAuthorIds.map(
        async (id) => [id, await resolveAuthorName(id)] as const,
      ),
    ),
  );

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

      {/* Article Cards */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          {articles.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">
              まだ記事がありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <Card className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card">
                    <div className="aspect-video relative bg-muted">
                      <Image
                        src={article.thumbnailUrl || "/placeholder.svg"}
                        alt={article.title}
                        fill
                        className="object-cover"
                      />
                      {article.platform && (
                        <div className="absolute top-4 left-4">
                          <span className="bg-gradient-orange text-white text-xs font-medium px-2 py-1 rounded-full">
                            {article.platform}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <p className="text-sm font-semibold text-gradient-orange mb-2">
                        {article.publishedAt}
                      </p>
                      <h3 className="text-xl font-bold mb-2 text-foreground">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {article.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-auto">
                        {authorNames.get(article.authorId)}
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
