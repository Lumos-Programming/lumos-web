import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { fetchBlogMetadata } from "@/lib/blog-metadata";

const metadataRequestSchema = z.object({ url: z.string() });

/**
 * 記事URLから、登録フォームに入れる情報 (サムネイル画像URL・タイトル・説明・公開日) を取得する。
 * 外部へのリクエストを中継するので、ログイン済みのメンバーだけに使わせる。
 * 自動で取れなかったときも 200 で `metadata: null` を返し、フォーム側で手動入力にしてもらう。
 */
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

  const parsed = metadataRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力の形式が正しくありません" },
      { status: 400 },
    );
  }

  const metadata = await fetchBlogMetadata(parsed.data.url);
  return NextResponse.json({ metadata });
}
