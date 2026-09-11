/**
 * GitHub ユーザー → Discord ユーザーの解決。
 *
 * マッチングは `githubId` (GitHub の数値 ID) を優先する。GitHub の username は
 * 改名できるため、login 一致だけだと改名した瞬間に紐付けが切れる。
 * login はフォールバックとしてのみ使う。
 *
 * DM 対象から外すメンバー:
 *   optedOut     … 退会済み
 *   isSubAccount … サブアカウント (本人には主アカウント側で届く)
 */

import { getDb } from "@/lib/firebase";
import type { MemberDocument } from "@/lib/members";
import type { GitHubUserRef } from "./types";

export interface RosterEntry {
  discordId: string;
  githubLogin: string;
  githubId?: string;
}

export interface Roster {
  byGithubId: Map<string, RosterEntry>;
  byLogin: Map<string, RosterEntry>;
}

export function buildRoster(
  members: { discordId: string; data: MemberDocument }[],
): Roster {
  const byGithubId = new Map<string, RosterEntry>();
  const byLogin = new Map<string, RosterEntry>();

  for (const { discordId, data } of members) {
    if (data.optedOut === true) continue;
    if (data.isSubAccount === true) continue;
    if (!data.github) continue;

    const entry: RosterEntry = {
      discordId,
      githubLogin: data.github,
      githubId: data.githubId,
    };
    if (data.githubId) byGithubId.set(data.githubId, entry);
    byLogin.set(data.github.toLowerCase(), entry);
  }

  return { byGithubId, byLogin };
}

/** Firestore の members から Roster を作る。 */
export async function loadRoster(): Promise<Roster> {
  const db = getDb();
  const snap = await db
    .collection("members")
    .select("github", "githubId", "optedOut", "isSubAccount")
    .get();

  return buildRoster(
    snap.docs.map((doc) => ({
      discordId: doc.id,
      data: doc.data() as MemberDocument,
    })),
  );
}

/** GitHub ユーザーに対応する Discord ID。未連携なら null。 */
export function resolveDiscordId(
  roster: Roster,
  user: GitHubUserRef,
): string | null {
  if (user.databaseId !== null) {
    const byId = roster.byGithubId.get(String(user.databaseId));
    if (byId) return byId.discordId;
  }
  return roster.byLogin.get(user.login.toLowerCase())?.discordId ?? null;
}
