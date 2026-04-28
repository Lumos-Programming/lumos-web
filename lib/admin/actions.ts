"use server";

import { isAdmin } from "@/lib/auth";
import { getGuildMembers, type DiscordGuildMember } from "@/lib/discord-guild";
import { getMemberRegistrationStatus } from "@/lib/members";
import { getDb } from "@/lib/firebase";
import {
  sendDiscordDm,
  buildRegistrationNudgeMessage,
  buildOnboardingNudgeMessage,
} from "@/lib/discord-dm";
import { getOptoutSubmissionIds } from "@/lib/discord-optout";
import {
  syncMemberDiscordRoles,
  getGuildRoleNameMap,
  ensureRolesInMap,
} from "@/lib/discord-role";
import type { EnrollmentRecord } from "@/types/profile";

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

export type MemberSyncDetail = {
  discordId: string;
  discordUsername: string;
  addedRoleIds: string[];
  errors: string[];
};

export type SyncRolesResult = {
  total: number;
  success: number;
  failed: number;
  details: MemberSyncDetail[];
};

export async function syncAllMemberDiscordRoles(): Promise<SyncRolesResult> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }

  const db = getDb();
  const snap = await db
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .select(
      "discordUsername",
      "memberType",
      "optedOut",
      "yearByFiscal",
      "enrollments",
      "interests",
    )
    .get();

  const result: SyncRolesResult = {
    total: 0,
    success: 0,
    failed: 0,
    details: [],
  };

  const currentYear = String(new Date().getFullYear());
  const targets = snap.docs.filter((doc) => doc.data().optedOut !== true);
  result.total = targets.length;

  const roleNameMap = await getGuildRoleNameMap();
  console.log(
    `[role-sync] ギルドロール ${roleNameMap.size}件を取得: [${[...roleNameMap.keys()].join(", ")}]`,
  );
  console.log(`[role-sync] 対象メンバー: ${result.total}件`);

  // 全メンバーのプロフィール値を集めてまとめてロールを作成（重複作成を防ぐ）
  const allProfileKeys = new Set<string>();
  for (const doc of targets) {
    const { memberType, yearByFiscal, enrollments, interests } = doc.data();
    const year = (yearByFiscal as Record<string, string> | undefined)?.[
      currentYear
    ];
    const faculty = (enrollments as EnrollmentRecord[] | undefined)?.find(
      (e) => e.isCurrent,
    )?.faculty;
    if (memberType) allProfileKeys.add(memberType);
    if (year) allProfileKeys.add(year);
    if (faculty) allProfileKeys.add(faculty);
    for (const tag of (interests as string[] | undefined) ?? []) {
      allProfileKeys.add(tag);
    }
  }
  await ensureRolesInMap([...allProfileKeys], roleNameMap);

  const CONCURRENCY = 2;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (doc) => {
        const {
          discordUsername,
          memberType,
          yearByFiscal,
          enrollments,
          interests,
        } = doc.data();
        const year = (yearByFiscal as Record<string, string> | undefined)?.[
          currentYear
        ];
        const faculty = (enrollments as EnrollmentRecord[] | undefined)?.find(
          (e) => e.isCurrent,
        )?.faculty;
        const roleResult = await syncMemberDiscordRoles(
          doc.id,
          { memberType, year, faculty, interests },
          roleNameMap,
        );
        const detail: MemberSyncDetail = {
          discordId: doc.id,
          discordUsername: discordUsername ?? doc.id,
          addedRoleIds: roleResult.added,
          errors: roleResult.errors,
        };
        result.details.push(detail);
        if (roleResult.errors.length > 0) {
          result.failed++;
          console.error(
            `[role-sync] NG ${discordUsername ?? doc.id}: errors=${roleResult.errors.join(" | ")}`,
          );
        } else {
          result.success++;
          console.log(
            `[role-sync] OK ${discordUsername ?? doc.id}: added=[${roleResult.added.join(", ") || "なし"}]`,
          );
        }
      }),
    );

    if (i + CONCURRENCY < targets.length) {
      await sleep(1000);
    }
  }

  console.log(
    `[role-sync] 完了: 成功=${result.success}, 失敗=${result.failed}`,
  );
  return result;
}
