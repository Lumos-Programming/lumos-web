"use server";

import { isAdmin } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { getGuildMembers, type DiscordGuildMember } from "@/lib/discord-guild";
import {
  sendDiscordDm,
  buildWelcomeMessage,
  buildOnboardingCompleteMessage,
  buildLoginMessage,
  buildWelcomeBackMessage,
  buildRegistrationNudgeMessage,
  buildOnboardingNudgeMessage,
  buildOptoutConfirmRequestMessage,
  type DiscordMessagePayload,
} from "@/lib/discord-dm";
import { getOptoutFinalizeUrl } from "@/lib/discord-optout";
import { sendLineNextEvent } from "@/lib/mini-lt/actions/line";

// --- Types ---

export type GuildMemberInfo = {
  discordId: string;
  displayName: string;
  avatarUrl: string | null;
};

// --- Helpers ---

function buildAvatarUrl(member: DiscordGuildMember): string | null {
  const { id, avatar } = member.user;
  if (!avatar) return null;
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${extension}?size=128`;
}

function buildMessagePayload(
  messageType: string,
  displayName: string,
  discordId: string,
): DiscordMessagePayload {
  switch (messageType) {
    case "welcome":
      return buildWelcomeMessage(displayName);
    case "onboarding_complete":
      return buildOnboardingCompleteMessage(displayName, {
        percentage: 56,
        filledCount: 5,
        totalCount: 9,
        missingFields: ["GitHub", "LinkedIn", "生年月日", "性別"],
      });
    case "login":
      return buildLoginMessage(displayName);
    case "welcome_back":
      return buildWelcomeBackMessage(displayName, discordId, {
        percentage: 56,
        filledCount: 5,
        totalCount: 9,
        missingFields: ["GitHub", "LinkedIn", "生年月日", "性別"],
      });
    case "registration_nudge":
      return buildRegistrationNudgeMessage(displayName, discordId);
    case "onboarding_nudge":
      return buildOnboardingNudgeMessage(displayName, discordId);
    case "optout_confirm_request":
      return buildOptoutConfirmRequestMessage(
        displayName,
        getOptoutFinalizeUrl(discordId),
      );
    default:
      throw new Error(`不明なメッセージタイプ: ${messageType}`);
  }
}

// --- Actions ---

export async function getGuildMemberList(): Promise<GuildMemberInfo[]> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }
  if (isProduction()) {
    throw new Error("本番環境では使用できません");
  }

  const members = await getGuildMembers();

  return members
    .map((m) => ({
      discordId: m.user.id,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatarUrl: buildAvatarUrl(m),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function sendTestDiscordMessage(
  messageType: string,
  targetDiscordId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdmin())) {
    return { success: false, error: "管理者権限が必要です" };
  }
  if (isProduction()) {
    return { success: false, error: "本番環境では使用できません" };
  }

  try {
    const payload = buildMessagePayload(
      messageType,
      "テストユーザー",
      targetDiscordId,
    );
    await sendDiscordDm(targetDiscordId, payload);
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function sendTestLineMessage(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!(await isAdmin())) {
    return { success: false, error: "管理者権限が必要です" };
  }
  if (isProduction()) {
    return { success: false, error: "本番環境では使用できません" };
  }

  try {
    await sendLineNextEvent();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
