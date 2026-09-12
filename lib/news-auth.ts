import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";

/**
 * お知らせを書き換えられるのは運営だけ。
 * 認可を通ったら執筆者の Discord ID を、弾いたらそのまま返すレスポンスを返す。
 *
 * 権限は当面 ADMIN_ROLE_ID を流用している (issue #262)。プロジェクトリーダー用の
 * ロールを分ける場合はここだけ差し替えれば API ルート側は触らなくて済む。
 */
export async function authorizeNewsWriter(): Promise<
  { authorId: string } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  // 退会済みでもセッションに管理者フラグが残り得るので、ここで必ず弾く
  if (session.user.optedOut) {
    return {
      response: NextResponse.json(
        { error: "退会済みのため操作できません" },
        { status: 403 },
      ),
    };
  }
  if (!(await isAdmin())) {
    return {
      response: NextResponse.json(
        { error: "お知らせを編集する権限がありません" },
        { status: 403 },
      ),
    };
  }
  return { authorId: session.user.id };
}
