import { listAllNews } from "@/lib/news";
import { PageHeader } from "@/components/page-header";
import { NewsManager } from "@/components/news/news-manager";

// 管理画面は常に最新の状態を見せる (下書きの反映が遅れると編集の取り違えが起きる)
export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  // 権限は admin/layout.tsx が見ている
  const articles = await listAllNews();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-spring-up">
      <PageHeader
        title="お知らせ管理"
        description="Lumos公式のお知らせを作成・公開します。公開すると /news に出ます。"
      />
      <NewsManager initialArticles={articles} />
    </div>
  );
}
