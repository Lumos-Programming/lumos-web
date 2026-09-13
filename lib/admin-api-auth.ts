import type { Session } from "next-auth";

/**
 * 運営だけが叩ける API ルートの認可。
 *
 * 退会済みでもセッションに管理者フラグが残り得るので、isAdmin だけでなく
 * optedOut も見る (メンバー画面側の redirect は API には効かない)。
 */
export function isAdminSession(session: Session | null): boolean {
  const user = session?.user;
  return Boolean(user?.id) && user?.optedOut !== true && user?.isAdmin === true;
}
