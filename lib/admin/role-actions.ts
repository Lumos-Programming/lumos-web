"use server";

import { isAdmin } from "@/lib/auth";
import { getGuildMembers } from "@/lib/discord-guild";
import { addRoleToMember } from "@/lib/discord";

const SNOWFLAKE_RE = /^\d{17,20}$/;

export type RoleAssignmentCandidate = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
};

export type RoleAssignmentResult = {
  total: number;
  success: number;
  failed: number;
  failures: { discordId: string; username: string; error: string }[];
};

function buildAvatarUrl(userId: string, avatar: string | null): string | null {
  if (!avatar) return null;
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}?size=128`;
}

function validateInput(roleId: string, joinedAfter: string): Date {
  if (!SNOWFLAKE_RE.test(roleId)) {
    throw new Error("ロールIDは17-20桁の数字である必要があります");
  }
  const cutoff = new Date(joinedAfter);
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error("基準日時の形式が不正です");
  }
  return cutoff;
}

export async function previewRoleAssignment(
  roleId: string,
  joinedAfter: string,
): Promise<RoleAssignmentCandidate[]> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }

  const cutoff = validateInput(roleId, joinedAfter);
  const members = await getGuildMembers();

  return members
    .filter((m) => {
      if (!m.joined_at) return false;
      const joinedAt = new Date(m.joined_at);
      if (Number.isNaN(joinedAt.getTime())) return false;
      if (joinedAt < cutoff) return false;
      if (m.roles.includes(roleId)) return false;
      return true;
    })
    .map((m) => ({
      discordId: m.user.id,
      username: m.user.username,
      displayName: m.nick || m.user.global_name || m.user.username,
      avatarUrl: buildAvatarUrl(m.user.id, m.user.avatar),
      joinedAt: m.joined_at,
    }))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function assignRoleByJoinDate(
  roleId: string,
  joinedAfter: string,
  discordIds: string[],
): Promise<RoleAssignmentResult> {
  if (!(await isAdmin())) {
    throw new Error("管理者権限が必要です");
  }

  // re-validate; client could have been tampered with
  validateInput(roleId, joinedAfter);

  if (discordIds.length === 0) {
    return { total: 0, success: 0, failed: 0, failures: [] };
  }

  // Re-compute candidates server-side and only act on the intersection.
  // This protects against stale client state and against the client passing
  // discordIds outside the actual candidate set.
  const candidates = await previewRoleAssignment(roleId, joinedAfter);
  const candidateMap = new Map(candidates.map((c) => [c.discordId, c]));
  const targetIds = discordIds.filter((id) => candidateMap.has(id));

  const result: RoleAssignmentResult = {
    total: targetIds.length,
    success: 0,
    failed: 0,
    failures: [],
  };

  for (const id of targetIds) {
    const member = candidateMap.get(id)!;
    try {
      await addRoleToMember(id, roleId);
      result.success++;
    } catch (e) {
      result.failed++;
      result.failures.push({
        discordId: id,
        username: member.displayName,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    await sleep(250);
  }

  return result;
}
