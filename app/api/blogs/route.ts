import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBlog, parseBlogInput } from "@/lib/blogs";
import { toBlogErrorResponse } from "@/lib/blog-response";

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
    return NextResponse.json(blog);
  } catch (error) {
    return toBlogErrorResponse(error, "Failed to create blog");
  }
}
