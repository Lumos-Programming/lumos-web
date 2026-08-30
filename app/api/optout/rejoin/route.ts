import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteOptoutSubmission } from "@/lib/discord-optout";
import { getMember, markMemberRejoined } from "@/lib/members";
import { sendDiscordDm, buildRejoinCompletedMessage } from "@/lib/discord-dm";
import { fetchDiscordDisplayName } from "@/lib/discord";
import { syncMemberDiscordRoles } from "@/lib/discord-role";

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

  // 再加入歓迎 DM + ロール同期 (失敗してもレスポンスには影響させない)
  let member: Awaited<ReturnType<typeof getMember>> = null;
  try {
    member = await getMember(discordId);
    const displayName =
      member?.discordUsername ??
      member?.nickname ??
      (await fetchDiscordDisplayName(discordId)) ??
      "Discord ユーザー";
    await sendDiscordDm(discordId, buildRejoinCompletedMessage(displayName));
  } catch (e) {
    console.error("Failed to send rejoin DM:", e);
  }

  // 退会者ロール削除 + 通常ロール付与 (fire-and-forget)
  if (member) {
    syncMemberDiscordRoles(discordId, {
      year: member.yearByFiscal?.[String(new Date().getFullYear())],
      faculty: member.enrollments?.find((e) => e.isCurrent)?.faculty,
      memberType: member.memberType,
    }).catch((e) => {
      console.error("Failed to sync Discord roles (rejoin):", e);
    });
  }

  return NextResponse.json({ success: true });
}
