"use server";

import { isAdmin } from "@/lib/auth";
import { getGuildMembers, type DiscordGuildMember } from "@/lib/discord-guild";
import { getMemberRegistrationStatus } from "@/lib/members";
import {
  sendDiscordDm,
  buildRegistrationNudgeMessage,
  buildOnboardingNudgeMessage,
} from "@/lib/discord-dm";
import { getOptoutSubmissionIds } from "@/lib/discord-optout";
import { getDb } from "@/lib/firebase";

export type MemberStatus = "unregistered" | "onboarding";

export type UnregisteredMember = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: MemberStatus;
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

  const [guildMembers, { registeredIds, onboardingIds, optedOutIds }] =
    await Promise.all([getGuildMembers(), getMemberRegistrationStatus()]);

  return guildMembers
    .filter((m) => !registeredIds.has(m.user.id))
    .filter((m) => !optedOutIds.has(m.user.id))
    .map((m) => ({
      discordId: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatarUrl: buildAvatarUrl(m),
      status: onboardingIds.has(m.user.id)
        ? ("onboarding" as const)
        : ("unregistered" as const),
    }))
    .sort((a, b) => {
      // onboarding first, then unregistered
      if (a.status !== b.status) {
        return a.status === "onboarding" ? -1 : 1;
      }
      return a.displayName.localeCompare(b.displayName);
    });
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

  // Fetch unregistered members to get usernames and status for the message
  const unregistered = await getUnregisteredMembers();
  const memberMap = new Map(unregistered.map((m) => [m.discordId, m]));

  // 退会メンバーを除外する
  const optedOutIds = await getOptoutSubmissionIds();
  const targetIds = discordIds.filter((id) => !optedOutIds.has(id));

  const result: SendResult = {
    total: targetIds.length,
    success: 0,
    failed: 0,
    failures: [],
  };

  // 同時2件で並列送信し、バッチ間は1秒待機してレート制御
  const CONCURRENCY = 2;
  for (let i = 0; i < targetIds.length; i += CONCURRENCY) {
    const batch = targetIds.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (id) => {
        const member = memberMap.get(id);
        const username = member?.displayName ?? "メンバー";
        const message =
          member?.status === "onboarding"
            ? buildOnboardingNudgeMessage(username, id)
            : buildRegistrationNudgeMessage(username, id);

        try {
          await sendDiscordDm(id, message);
          result.success++;
        } catch (e) {
          result.failed++;
          result.failures.push({
            discordId: id,
            username,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }),
    );

    if (i + CONCURRENCY < targetIds.length) {
      await sleep(1000);
    }
  }

  return result;
}

export type AdminMemberRow = {
  discordId: string;
  discordUsername: string;
  discordHandle?: string;
  lastName: string;
  firstName: string;
  nickname: string;
  studentId: string;
  memberType?: string;
  year?: string;
  faculty?: string;
  interests: string[];
  github?: string;
  x?: string;
  lineName?: string;
  hasLine: boolean;
  onboardingCompleted: boolean;
  optedOut: boolean;
  createdAt: string;
};

export async function getAdminMembers(): Promise<AdminMemberRow[]> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }

  const db = getDb();
  const snap = await db.collection("members").get();
  const currentYear = String(new Date().getFullYear());

  return snap.docs
    .map((doc) => {
      const d = doc.data();
      const currentEnrollment = (d.enrollments ?? []).find(
        (e: { isCurrent: boolean }) => e.isCurrent,
      );
      return {
        discordId: doc.id,
        discordUsername: d.discordUsername ?? "",
        discordHandle: d.discordHandle,
        lastName: d.lastName ?? "",
        firstName: d.firstName ?? "",
        nickname: d.nickname ?? "",
        studentId: d.studentId ?? "",
        memberType: d.memberType,
        year: d.yearByFiscal?.[currentYear],
        faculty: currentEnrollment?.faculty,
        interests: d.interests ?? [],
        github: d.github,
        x: d.x,
        lineName: d.line,
        hasLine: !!d.lineId,
        onboardingCompleted: d.onboardingCompleted === true,
        optedOut: d.optedOut === true,
        createdAt: d.createdAt?.toDate().toISOString() ?? "",
      } satisfies AdminMemberRow;
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "ja"));
}
