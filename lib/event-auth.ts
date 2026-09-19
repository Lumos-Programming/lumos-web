import type { Session } from "next-auth";

/**
 * イベントを登録・編集できるのは運営だけ。
 *
 * 退会済みでもセッションに管理者フラグが残り得るので、isAdmin だけでなく
 * optedOut も見る (メンバー画面側の redirect は API には効かない)。
 *
 * 「管理者かどうか」ではなく「イベントを編集できるか」の判定として置いているので、
 * 権限の持ち方を変えるときはここだけ差し替えれば API ルート側は触らなくて済む。
 */
export function isEventEditor(session: Session | null): boolean {
  const user = session?.user;
  return Boolean(user?.id) && user?.optedOut !== true && user?.isAdmin === true;
}
