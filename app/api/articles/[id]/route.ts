import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateArticle, deleteArticle } from "@/lib/articles";

function toErrorResponse(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message === "Invalid URL" ||
      error.message === "Title is required"
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "他人の記事は操作できません" },
        { status: 403 },
      );
    }
    if (error.message === "Article not found") {
      return NextResponse.json(
        { error: "記事が見つかりません" },
        { status: 404 },
      );
    }
  }
  console.error("Failed to update article:", error);
  return NextResponse.json(
    { error: "Failed to update article" },
    { status: 500 },
  );
}

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
    const body = await request.json();
    const { url, title, publishedAt, description, thumbnailUrl, platform } =
      body;
    await updateArticle(id, session.user.id, {
      url,
      title,
      publishedAt,
      description,
      thumbnailUrl,
      platform,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
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
    await deleteArticle(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
