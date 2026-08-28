import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBlog } from "@/lib/blogs";

function toErrorResponse(error: unknown) {
  if (
    error instanceof Error &&
    (error.message === "Invalid URL" || error.message === "Title is required")
  ) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("Failed to create blog:", error);
  return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
}

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
    const body = await request.json();
    const { url, title, publishedAt, description, thumbnailUrl, platform } =
      body;
    const blog = await createBlog(session.user.id, {
      url,
      title,
      publishedAt,
      description,
      thumbnailUrl,
      platform,
    });
    return NextResponse.json(blog);
  } catch (error) {
    return toErrorResponse(error);
  }
}
