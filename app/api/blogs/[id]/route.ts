import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateBlog, deleteBlog, parseBlogInput } from "@/lib/blogs";
import { toBlogErrorResponse } from "@/lib/blog-response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    // JSON として読めない本文も「不正な入力」として 400 に落とす
    const body = await request.json().catch(() => null);
    await updateBlog(id, session.user.id, parseBlogInput(body));
    return NextResponse.json({ success: true });
  } catch (error) {
    return toBlogErrorResponse(error, "Failed to update blog");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    await deleteBlog(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toBlogErrorResponse(error, "Failed to delete blog");
  }
}
