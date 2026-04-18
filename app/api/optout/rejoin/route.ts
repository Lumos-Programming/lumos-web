import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteOptoutSubmission } from "@/lib/discord-optout";
import { getMember, markMemberRejoined } from "@/lib/members";
import { sendDiscordDm, buildRejoinCompletedMessage } from "@/lib/discord-dm";
import { fetchDiscordDisplayName } from "@/lib/discord";

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

  // 再加入歓迎 DM (失敗してもレスポンスには影響させない)
  try {
    const member = await getMember(discordId);
    const displayName =
      member?.discordUsername ??
      member?.nickname ??
      (await fetchDiscordDisplayName(discordId)) ??
      "Discord ユーザー";
    await sendDiscordDm(discordId, buildRejoinCompletedMessage(displayName));
  } catch (e) {
    console.error("Failed to send rejoin DM:", e);
  }

  return NextResponse.json({ success: true });
}
