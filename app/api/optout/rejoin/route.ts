import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteOptoutSubmission } from "@/lib/discord-optout";
import { markMemberRejoined } from "@/lib/members";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未ログインです" }, { status: 401 });
  }

  const discordId = session.user.id;

  try {
    await deleteOptoutSubmission(discordId);
    await markMemberRejoined(discordId);
  } catch (e) {
    console.error("Failed to rejoin:", e);
    return NextResponse.json(
      { error: "再加入処理に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
