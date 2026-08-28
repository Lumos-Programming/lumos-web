import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listBlogsByAuthor } from "@/lib/blogs";
import { PageHeader } from "@/components/page-header";
import { BlogManager } from "@/components/blogs/blog-manager";

export default async function BlogsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const blogs = await listBlogsByAuthor(session.user.id);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-spring-up">
      <PageHeader
        title="記事管理"
        description="Qiita / Zenn / Medium など、外部に書いた記事を登録できます。"
      />
      <BlogManager initialBlogs={blogs} />
    </div>
  );
}
