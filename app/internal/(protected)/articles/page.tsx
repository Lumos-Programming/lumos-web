import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listArticlesByAuthor } from "@/lib/articles";
import { PageHeader } from "@/components/page-header";
import { ArticleManager } from "@/components/articles/article-manager";

export default async function ArticlesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const articles = await listArticlesByAuthor(session.user.id);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-spring-up">
      <PageHeader
        title="記事管理"
        description="Qiita / Zenn / Medium など、外部に書いた記事を登録できます。"
      />
      <ArticleManager initialArticles={articles} />
    </div>
  );
}
