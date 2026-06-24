import { fetchDiscordUserAvatarHash } from "@/lib/discord";
import { updateMemberDiscordAvatar } from "@/lib/members";

/** Discord アバター定期更新バッチが扱うメンバー情報 */
export interface DiscordAvatarMember {
  discordId: string;
  discordAvatar?: string;
}

export type RefreshDiscordAvatarResult =
  | { status: "updated"; discordId: string }
  | { status: "skipped"; discordId: string; reason: string }
  | { status: "failed"; discordId: string; error: string };

/**
 * 1メンバーの Discord アバター hash を最新化する。
 *
 * discordAvatar には avatar hash を保存している。ユーザーが Discord 側で
 * アバターを変更すると hash が変わり、保存済みの古い hash / URL は CDN で 404 になる
 * （リンク切れ）。ログイン時にも更新されるが、ログイン頻度が低いと追従できないため、
 * Bot トークンで GET /users/{id} を叩いて最新 hash に上書きする。
 *
 * アバター未設定ユーザーは hash が空文字。退会・削除ユーザーは更新対象外でスキップ。
 */
export async function refreshSingleMemberDiscordAvatar(
  member: DiscordAvatarMember,
): Promise<RefreshDiscordAvatarResult> {
  const { discordId } = member;
  try {
    const latestHash = await fetchDiscordUserAvatarHash(discordId);

    // ユーザーが見つからない（退会・削除）→ 既存値を保持してスキップ
    if (latestHash === null) {
      return { status: "skipped", discordId, reason: "user not found" };
    }

    // 既に最新の hash が保存済みなら書き込みを省略
    if (latestHash === member.discordAvatar) {
      return { status: "skipped", discordId, reason: "no change" };
    }

    await updateMemberDiscordAvatar(discordId, latestHash);
    return { status: "updated", discordId };
  } catch (e) {
    return {
      status: "failed",
      discordId,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
