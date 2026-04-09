"use server";

import { isAdmin } from "@/lib/auth";
import { getGuildMembers, type DiscordGuildMember } from "@/lib/discord-guild";
import { getRegisteredDiscordIds } from "@/lib/members";
import { sendDiscordDm, buildRegistrationNudgeMessage } from "@/lib/discord-dm";

export type UnregisteredMember = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SendResult = {
  total: number;
  success: number;
  failed: number;
  failures: { discordId: string; username: string; error: string }[];
};

function buildAvatarUrl(member: DiscordGuildMember): string | null {
  const { id, avatar } = member.user;
  if (!avatar) return null;
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${extension}?size=128`;
}

export async function getUnregisteredMembers(): Promise<UnregisteredMember[]> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }

  const [guildMembers, registeredIds] = await Promise.all([
    getGuildMembers(),
    getRegisteredDiscordIds(),
  ]);

  return guildMembers
    .filter((m) => !registeredIds.has(m.user.id))
    .map((m) => ({
      discordId: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatarUrl: buildAvatarUrl(m),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendRegistrationNudge(
  discordIds: string[],
): Promise<SendResult> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }

  if (discordIds.length === 0) {
    return { total: 0, success: 0, failed: 0, failures: [] };
  }

  // Fetch unregistered members to get usernames for the message
  const unregistered = await getUnregisteredMembers();
  const memberMap = new Map(unregistered.map((m) => [m.discordId, m]));

  const result: SendResult = {
    total: discordIds.length,
    success: 0,
    failed: 0,
    failures: [],
  };

  for (let i = 0; i < discordIds.length; i++) {
    const id = discordIds[i];
    const member = memberMap.get(id);
    const username = member?.displayName ?? "メンバー";

    try {
      await sendDiscordDm(id, buildRegistrationNudgeMessage(username));
      result.success++;
    } catch (e) {
      result.failed++;
      result.failures.push({
        discordId: id,
        username,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Rate limit: wait 1 second between messages (skip after last)
    if (i < discordIds.length - 1) {
      await sleep(1000);
    }
  }

  return result;
}
