"use server";

import { auth } from "@/lib/auth";
import { getMember } from "@/lib/members";
import { sendDiscordDm } from "@/lib/discord-dm";
import type { DiscordMessagePayload } from "@/lib/discord-dm";

function buildJokeDmPayload(
  senderName: string,
  recipientName: string,
  joke: string,
): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: `${recipientName}さん、誕生日おめでとうございます！`,
        description: `**${senderName}** さんからメッセージが届きました\n\`\`\`\n${joke}\n\`\`\``,
        color: 0xf59e0b,
        fields: [],
      },
    ],
  };
}

export async function sendBirthdayJokeDm(
  recipientDiscordId: string,
  recipientName: string,
  joke: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "ログインが必要です" };
  }

  const sender = await getMember(session.user.id);
  const senderName = sender?.nickname || session.user.name || "Lumos メンバー";

  try {
    await sendDiscordDm(
      recipientDiscordId,
      buildJokeDmPayload(senderName, recipientName, joke),
    );
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
