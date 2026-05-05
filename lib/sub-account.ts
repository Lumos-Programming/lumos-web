import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export type SubAccountInfo = {
  discordId: string;
  discordUsername: string;
  discordHandle?: string;
  discordAvatar: string;
  linkedAt?: FirebaseFirestore.Timestamp;
};

export type LinkSubAccountResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "self_link"
        | "already_member"
        | "already_linked_to_other"
        | "primary_has_sub";
    };

/**
 * メインアカウントにサブアカウントを連携する。
 * メイン側 doc に subAccountDiscordId をセットし、サブ側 doc を新規作成する。
 * 両方の更新を 1 つのトランザクションで行う。
 */
export async function linkSubAccount(params: {
  primaryDiscordId: string;
  sub: {
    discordId: string;
    username: string;
    handle?: string;
    avatar: string;
  };
}): Promise<LinkSubAccountResult> {
  const { primaryDiscordId, sub } = params;

  if (primaryDiscordId === sub.discordId) {
    return { ok: false, error: "self_link" };
  }

  const db = getDb();
  const primaryRef = db.collection("members").doc(primaryDiscordId);
  const subRef = db.collection("members").doc(sub.discordId);

  return await db.runTransaction(async (tx) => {
    const [primarySnap, subSnap] = await Promise.all([
      tx.get(primaryRef),
      tx.get(subRef),
    ]);

    const primaryData = primarySnap.data() ?? {};
    if (primaryData.subAccountDiscordId) {
      return { ok: false, error: "primary_has_sub" } as LinkSubAccountResult;
    }

    if (subSnap.exists) {
      const subData = subSnap.data() ?? {};
      // 既に Lumos の (メイン) メンバーとして登録済み
      if (subData.isSubAccount !== true) {
        return { ok: false, error: "already_member" } as LinkSubAccountResult;
      }
      // 既に別のメインに紐づいているサブ
      if (
        subData.primaryDiscordId &&
        subData.primaryDiscordId !== primaryDiscordId
      ) {
        return {
          ok: false,
          error: "already_linked_to_other",
        } as LinkSubAccountResult;
      }
    }

    tx.set(
      subRef,
      {
        isSubAccount: true,
        primaryDiscordId,
        discordUsername: sub.username,
        ...(sub.handle ? { discordHandle: sub.handle } : {}),
        discordAvatar: sub.avatar,
        linkedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    tx.update(primaryRef, {
      subAccountDiscordId: sub.discordId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true } as LinkSubAccountResult;
  });
}

/**
 * メインアカウントに連携されたサブアカウントを解除する。
 * メイン側の subAccountDiscordId を削除し、サブ側のドキュメントを削除する。
 */
export async function unlinkSubAccount(params: {
  primaryDiscordId: string;
  subDiscordId: string;
}): Promise<{ ok: true } | { ok: false; error: "not_linked" | "not_owner" }> {
  const { primaryDiscordId, subDiscordId } = params;
  const db = getDb();
  const primaryRef = db.collection("members").doc(primaryDiscordId);
  const subRef = db.collection("members").doc(subDiscordId);

  return await db.runTransaction(async (tx) => {
    const [primarySnap, subSnap] = await Promise.all([
      tx.get(primaryRef),
      tx.get(subRef),
    ]);

    if (
      !primarySnap.exists ||
      primarySnap.data()?.subAccountDiscordId !== subDiscordId
    ) {
      return { ok: false, error: "not_linked" } as const;
    }
    if (
      !subSnap.exists ||
      subSnap.data()?.primaryDiscordId !== primaryDiscordId
    ) {
      return { ok: false, error: "not_owner" } as const;
    }

    tx.update(primaryRef, {
      subAccountDiscordId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.delete(subRef);

    return { ok: true } as const;
  });
}

/**
 * メインアカウントに紐づくサブアカウント情報を取得する。
 */
export async function getSubAccount(
  primaryDiscordId: string,
): Promise<SubAccountInfo | null> {
  const db = getDb();
  const primarySnap = await db
    .collection("members")
    .doc(primaryDiscordId)
    .get();
  const subId = primarySnap.data()?.subAccountDiscordId as string | undefined;
  if (!subId) return null;

  const subSnap = await db.collection("members").doc(subId).get();
  if (!subSnap.exists) return null;
  const data = subSnap.data() ?? {};
  return {
    discordId: subId,
    discordUsername: data.discordUsername ?? "",
    discordHandle: data.discordHandle,
    discordAvatar: data.discordAvatar ?? "",
    linkedAt: data.linkedAt,
  };
}

/**
 * 与えられた discordId がサブアカウントとして登録済みかを判定する。
 * NextAuth の signIn callback でログイン拒否に使う。
 */
export async function isSubAccountDiscordId(
  discordId: string,
): Promise<boolean> {
  const db = getDb();
  const snap = await db.collection("members").doc(discordId).get();
  return snap.exists && snap.data()?.isSubAccount === true;
}
