import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";

export type DiscordOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  /** Auth.js の expires_at と同じ Unix timestamp（秒）。 */
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
};

type DiscordOAuthTokenDocument = DiscordOAuthTokens & {
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
};

/**
 * 認証で受け取ったトークン一式を置き換える。
 * members はプロフィール API でも返すため、認証情報は専用コレクションに保存する。
 */
export async function saveDiscordOAuthTokens(
  discordId: string,
  tokens: DiscordOAuthTokens,
): Promise<void> {
  const db = getDb();
  const memberRef = db.collection("members").doc(discordId);
  const tokenRef = db.collection("discord_oauth_tokens").doc(discordId);

  await db.runTransaction(async (tx) => {
    // 退会処理と同じ順序でメンバーを先に読み、ロック順序の逆転を避ける。
    const member = await tx.get(memberRef);
    if (!member.exists) {
      throw new Error("Discord member does not exist");
    }
    // 退会やサブアカウントへの移行と競合したログインで、トークンを復活させない。
    if (
      member.data()?.optedOut === true ||
      member.data()?.isSubAccount === true
    ) {
      tx.delete(tokenRef);
      return;
    }

    const previous = await tx.get(tokenRef);
    tx.set(tokenRef, {
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken !== undefined
        ? { refreshToken: tokens.refreshToken }
        : {}),
      ...(tokens.expiresAt !== undefined
        ? { expiresAt: tokens.expiresAt }
        : {}),
      ...(tokens.scope !== undefined ? { scope: tokens.scope } : {}),
      ...(tokens.tokenType !== undefined
        ? { tokenType: tokens.tokenType }
        : {}),
      createdAt: previous.data()?.createdAt ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/** サーバー内の Discord API 呼び出し用。戻り値をクライアントに渡さない。 */
export async function getDiscordOAuthTokens(
  discordId: string,
): Promise<DiscordOAuthTokenDocument | null> {
  const snap = await getDb()
    .collection("discord_oauth_tokens")
    .doc(discordId)
    .get();
  return snap.exists ? (snap.data() as DiscordOAuthTokenDocument) : null;
}

export async function deleteDiscordOAuthTokens(
  discordId: string,
): Promise<void> {
  await getDb().collection("discord_oauth_tokens").doc(discordId).delete();
}
