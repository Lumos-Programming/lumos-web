import type { Session } from "next-auth";

/**
 * お知らせを書き換えられるのは運営だけ。
 *
 * 退会済みでもセッションに管理者フラグが残り得るので、isAdmin だけでなく optedOut も見る
 * (メンバー画面側の redirect は API には効かない)。
 *
 * 権限は当面 ADMIN_ROLE_ID を流用している (issue #262)。プロジェクトリーダー用の
 * ロールを分ける場合はここだけ差し替えれば API ルート側は触らなくて済む。
 */
export function isNewsEditor(session: Session | null): boolean {
  const user = session?.user;
  return Boolean(user?.id) && user?.optedOut !== true && user?.isAdmin === true;
}
