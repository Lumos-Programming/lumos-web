import { deleteNews, parseNewsInput, updateNews } from "@/lib/news";
import { NEWS_API_RESPONSES, toNewsErrorResponse } from "@/lib/news-response";
import { auth } from "@/lib/auth";
import { isNewsEditor } from "@/lib/news-auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NEWS_API_RESPONSES.unauthorized();
  if (!isNewsEditor(session)) return NEWS_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    await updateNews(id, parseNewsInput(body));
    return NEWS_API_RESPONSES.success();
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to update news article");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NEWS_API_RESPONSES.unauthorized();
  if (!isNewsEditor(session)) return NEWS_API_RESPONSES.forbidden();

  try {
    const { id } = await params;
    await deleteNews(id);
    return NEWS_API_RESPONSES.success();
  } catch (error) {
    return toNewsErrorResponse(error, "Failed to delete news article");
  }
}
