const DISCORD_API_BASE = "https://discord.com/api/v10";

export type SyncRolesResult = {
  added: string[];
  errors: string[];
};

export type MemberRoleParams = {
  memberType?: string;
  year?: string;
  faculty?: string;
  interests?: string[];
};

export async function addGuildMemberRole(
  userId: string,
  roleId: string,
): Promise<void> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    throw new Error("DISCORD_GUILD_ID または DISCORD_BOT_TOKEN が未設定です");
  }

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
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    throw new Error("DISCORD_GUILD_ID または DISCORD_BOT_TOKEN が未設定です");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`ロール削除失敗: ${response.status} ${error}`);
  }
}

type DiscordRole = { id: string; name: string };

function getGuildAndToken(): { guildId: string; botToken: string } {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) {
    throw new Error("DISCORD_GUILD_ID または DISCORD_BOT_TOKEN が未設定です");
  }
  return { guildId, botToken };
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

  // メンバー種別・学年・学部・興味分野はロール名でマッチング
  const nameKeys = [
    params.memberType,
    params.year,
    params.faculty,
    ...(params.interests ?? []),
  ];

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

  // マップにないロールを作成（onboarding 単体呼び出し用）
  const nameKeys = [
    params.memberType,
    params.year,
    params.faculty,
    ...(params.interests ?? []),
  ].filter(Boolean) as string[];
  await ensureRolesInMap(nameKeys, map);

  const { roleIds, matched, notFound } = getTargetRoleIds(params, map);

  console.log(
    `[role-sync] ${userId} matched=[${matched.join(", ")}] notFound=[${notFound.join(", ")}]`,
  );

  const added: string[] = [];
  const errors: string[] = [];

  for (const roleId of roleIds) {
    try {
      await addGuildMemberRole(userId, roleId);
      added.push(roleId);
    } catch (e) {
      errors.push(
        `roleId=${roleId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { added, errors };
}
