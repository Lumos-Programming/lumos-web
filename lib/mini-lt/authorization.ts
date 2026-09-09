import "server-only";

import { auth } from "@/lib/auth";

export async function requireMiniLtAdmin(): Promise<void> {
  const session = await auth();
  if (
    !session?.user?.id ||
    session.user.optedOut ||
    session.user.isAdmin !== true
  ) {
    throw new Error("管理者権限が必要です");
  }
}
