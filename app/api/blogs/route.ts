import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { createBlog, parseBlogInput } from "@/lib/blogs";
import { toBlogErrorResponse } from "@/lib/blog-response";
import {
  buildBlogNotification,
  notifyBlogChannel,
} from "@/lib/blog-notification";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.optedOut) {
    return NextResponse.json(
      { error: "退会済みアカウントでは操作できません" },
      { status: 403 },
    );
  }

  try {
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    const blog = await createBlog(session.user.id, parseBlogInput(body));
    // 通知はレスポンスを返したあとに送る。失敗しても登録は成功のままにする
    after(() =>
      notifyBlogChannel(buildBlogNotification(blog)).catch((e) => {
        console.error("Failed to notify blog channel:", e);
      }),
    );
    return NextResponse.json(blog);
  } catch (error) {
    return toBlogErrorResponse(error, "Failed to create blog");
  }
}
