import { publishNews, unpublishNews } from "@/lib/news";
import { NEWS_API_RESPONSES, toNewsErrorResponse } from "@/lib/news-response";
import { auth } from "@/lib/auth";
import { isNewsEditor } from "@/lib/news-auth";

/** 公開する */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NEWS_API_RESPONSES.unauthorized();
  if (!isNewsEditor(session)) return NEWS_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    await publishNews(id);
    return NEWS_API_RESPONSES.success();
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to publish news article");
  }
}

/** 下書きに戻す */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NEWS_API_RESPONSES.unauthorized();
  if (!isNewsEditor(session)) return NEWS_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    await unpublishNews(id);
    return NEWS_API_RESPONSES.success();
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to unpublish news article");
  }
}
