import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";

/**
 * 運営だけが叩ける API ルートの認可。
 * 通ったら操作者の Discord ID を、弾いたらそのまま返すレスポンスを返す。
 *
 * 退会済みでもセッションに管理者フラグが残り得るので、isAdmin だけでなく
 * optedOut も見る (メンバー画面側の redirect は API には効かない)。
 */
export async function authorizeAdminApi(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
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
        { error: "この操作を行う権限がありません" },
        { status: 403 },
      ),
    };
  }
  return { userId: session.user.id };
}
