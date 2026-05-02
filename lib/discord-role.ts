import { MEMBER_TYPES, FACULTIES, GRADUATE_SCHOOLS } from "@/types/profile";
import { ALL_PRESET_TAGS } from "@/types/interests";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// "学部1年" / "修士2年" / "博士3年" / "その他1年" などの学年文字列にマッチ
const YEAR_ROLE_PATTERN = /^(学部|修士|博士|その他)[1-9]\d*年$/;

// 管理対象ロール判定（削除候補になりうるロール）
// 付与はしないが過去に付与した興味分野・種別ロールも削除できるよう全種類を含む
function isProfileValueName(name: string): boolean {
  return (
    (MEMBER_TYPES as readonly string[]).includes(name) ||
    (FACULTIES as readonly string[]).includes(name) ||
    (GRADUATE_SCHOOLS as readonly string[]).includes(name) ||
    ALL_PRESET_TAGS.has(name) ||
    YEAR_ROLE_PATTERN.test(name)
  );
}

export type SyncRolesResult = {
  added: string[];
  removed: string[];
  errors: string[];
};

export type MemberRoleParams = {
  year?: string;
  faculty?: string;
};

type DiscordRole = { id: string; name: string };
type DiscordMember = { roles: string[] };

function getGuildAndToken(): { guildId: string; botToken: string } {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) {
    throw new Error("DISCORD_GUILD_ID または DISCORD_BOT_TOKEN が未設定です");
  }
  return { guildId, botToken };
}

export async function addGuildMemberRole(
  userId: string,
  roleId: string,
): Promise<void> {
  const { guildId, botToken } = getGuildAndToken();
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ロール付与失敗: ${response.status} ${error}`);
  }
}

export async function removeGuildMemberRole(
  userId: string,
  roleId: string,
): Promise<void> {
  const { guildId, botToken } = getGuildAndToken();
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bot ${botToken}` },
    },
  );
  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`ロール削除失敗: ${response.status} ${error}`);
  }
}

async function fetchGuildRoles(): Promise<DiscordRole[]> {
  const { guildId, botToken } = getGuildAndToken();
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ギルドロール取得失敗: ${response.status} ${error}`);
  }
  return response.json();
}

async function fetchGuildMemberRoles(userId: string): Promise<string[]> {
  const { guildId, botToken } = getGuildAndToken();
  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
    { headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`メンバー情報取得失敗: ${response.status} ${error}`);
  }
  const member: DiscordMember = await response.json();
  return member.roles;
}

async function createGuildRole(name: string): Promise<DiscordRole> {
  const { guildId, botToken } = getGuildAndToken();
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ロール作成失敗: ${response.status} ${error}`);
  }
  return response.json();
}

// ロール名 → ID のマップを返す。バッチ処理では一度だけ呼び出して使い回す。
export async function getGuildRoleNameMap(): Promise<Map<string, string>> {
  const roles = await fetchGuildRoles();
  return new Map(roles.map((r) => [r.name, r.id]));
}

// マップにない名前のロールを Discord に作成してマップを更新する。
export async function ensureRolesInMap(
  names: string[],
  roleNameMap: Map<string, string>,
): Promise<void> {
  const missing = [...new Set(names)].filter((n) => n && !roleNameMap.has(n));
  for (const name of missing) {
    try {
      const role = await createGuildRole(name);
      roleNameMap.set(role.name, role.id);
      console.log(`[role-sync] ロール作成: "${role.name}" → ${role.id}`);
    } catch (e) {
      console.error(
        `[role-sync] ロール作成失敗 "${name}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

function getTargetRoleIds(
  params: MemberRoleParams,
  roleNameMap: Map<string, string>,
): { roleIds: string[]; matched: string[]; notFound: string[] } {
  const roles: string[] = [];
  const matched: string[] = [];
  const notFound: string[] = [];

  // 年度メンバーロール（env var で固定指定）
  const memberRoleId = process.env.MEMBER_ROLE_ID;
  if (memberRoleId) {
    roles.push(memberRoleId);
    matched.push(`MEMBER_ROLE_ID(${memberRoleId})`);
  }

  // 学年・学部はロール名でマッチング
  const nameKeys = [params.year, params.faculty];

  for (const key of nameKeys) {
    if (!key) continue;
    const id = roleNameMap.get(key);
    if (id) {
      roles.push(id);
      matched.push(`"${key}"→${id}`);
    } else {
      notFound.push(`"${key}"`);
    }
  }

  return { roleIds: [...new Set(roles.filter(Boolean))], matched, notFound };
}

export async function syncMemberDiscordRoles(
  userId: string,
  params: MemberRoleParams,
  roleNameMap?: Map<string, string>,
): Promise<SyncRolesResult> {
  const map = roleNameMap ?? (await getGuildRoleNameMap());

  // マップにないロールを作成
  const nameKeys = [params.year, params.faculty].filter(Boolean) as string[];
  await ensureRolesInMap(nameKeys, map);

  const {
    roleIds: targetRoleIds,
    matched,
    notFound,
  } = getTargetRoleIds(params, map);

  // 現在のメンバーロールを取得して差分を計算
  const currentRoleIds = await fetchGuildMemberRoles(userId);
  const currentRoleSet = new Set(currentRoleIds);
  const targetRoleSet = new Set(targetRoleIds);

  // 管理対象ロール = プロフィール値名に対応するロールのみ（adminなど無関係なロールは触らない）
  const managedRoleIds = new Set([
    ...(process.env.MEMBER_ROLE_ID ? [process.env.MEMBER_ROLE_ID] : []),
    ...[...map.entries()]
      .filter(([name]) => isProfileValueName(name))
      .map(([, id]) => id),
  ]);

  const toAdd = targetRoleIds.filter((id) => !currentRoleSet.has(id));
  const toRemove = [...currentRoleSet].filter(
    (id) => managedRoleIds.has(id) && !targetRoleSet.has(id),
  );

  console.log(
    `[role-sync] ${userId} matched=[${matched.join(", ")}] notFound=[${notFound.join(", ")}] toAdd=[${toAdd.join(", ")}] toRemove=[${toRemove.join(", ")}]`,
  );

  const added: string[] = [];
  const removed: string[] = [];
  const errors: string[] = [];

  for (const roleId of toAdd) {
    try {
      await addGuildMemberRole(userId, roleId);
      added.push(roleId);
    } catch (e) {
      errors.push(
        `add roleId=${roleId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  for (const roleId of toRemove) {
    try {
      await removeGuildMemberRole(userId, roleId);
      removed.push(roleId);
    } catch (e) {
      errors.push(
        `remove roleId=${roleId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { added, removed, errors };
}
