import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export type SubAccountInfo = {
  discordId: string;
  discordUsername: string;
  discordHandle?: string;
  /** Discord の avatar hash。表示時に URL へ組み立てる。 */
  discordAvatar: string;
  /**
   * 連携日時 (Unix ms)。Firestore の Timestamp はクラスインスタンスで
   * Server Component → Client Component の境界を越えられないため数値で返す。
   */
  linkedAt?: number;
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
 * その doc が「実際に Lumos の会員として使われているか」を判定する。
 *
 * サブアカウントはギルドに居るので登録案内 DM の対象になり、そこで
 * ログインすると getOrCreateMember が、退会を押すと markMemberOptedOut が
 * members doc を作る。どちらも会員ではないので、サブアカウントとして
 * 引き継いでよい (退会の記録自体は optout_submissions に残る)。
 * 逆に登録済み・オンボーディング入力済みの doc は奪わない。
 */
function isRegisteredMemberDoc(data: FirebaseFirestore.DocumentData): boolean {
  if (data.onboardingCompleted === true) return true;
  return Boolean(data.studentId || data.lastName || data.firstName);
}

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
    /** Discord の avatar hash (完全 URL ではない)。未設定は空文字。 */
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
  /*
   * メイン側とサブ側の doc を両方読む。
   *
   * メイン側に subAccountDiscordId が入っていたら、もうサブを持っているので
   * primary_has_sub を返して終わり。
   *
   * サブ側の doc が既にある場合だけ、中身を見る。
   *   isSubAccount が true でない (= サブとして使われている doc ではない) なら、
   *     会員として登録済みの doc なら already_member を返して終わり。
   *     登録済みでなければ何もしない (このあと上書きして引き継ぐ)。
   *   isSubAccount が true なら、
   *     primaryDiscordId が入っていて、それが今のメインと違うなら
   *     already_linked_to_other を返して終わり。
   * サブ側の doc がまだ無ければ、何も見ずに次へ進む。
   *
   * ここまで抜けたら書き込む。
   *   サブ側 doc に isSubAccount / primaryDiscordId / Discord のプロフィールを
   *   merge で書き、引き継いだ doc に残っている会員フラグは delete で消す。
   *   メイン側 doc に subAccountDiscordId を書く。
   *   ok: true を返す。
   */
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
      if (subData.isSubAccount !== true) {
        // 既に Lumos の (メイン) メンバーとして使われている doc は奪わない
        if (isRegisteredMemberDoc(subData)) {
          return { ok: false, error: "already_member" } as LinkSubAccountResult;
        }
        // ログイン記録 / 退会スタブだけの doc はサブアカウントとして引き継ぐ
      } else if (
        subData.primaryDiscordId &&
        subData.primaryDiscordId !== primaryDiscordId
      ) {
        // 既に別のメインに紐づいているサブ
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
        // 引き継いだ doc に残っている会員向けフラグを消す
        onboardingCompleted: FieldValue.delete(),
        optedOut: FieldValue.delete(),
        optedOutAt: FieldValue.delete(),
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
 * メインアカウントの退会時に、連携済みサブアカウントを解除する。
 * 退会後は設定画面から解除できず、サブアカウントがログイン不能なまま
 * members に残り続けるため、退会フローから呼び出す。連携が無ければ何もしない。
 */
export async function unlinkSubAccountOnOptout(
  primaryDiscordId: string,
): Promise<void> {
  const db = getDb();
  const primarySnap = await db
    .collection("members")
    .doc(primaryDiscordId)
    .get();
  const subDiscordId = primarySnap.data()?.subAccountDiscordId as
    string | undefined;
  if (!subDiscordId) return;

  await unlinkSubAccount({ primaryDiscordId, subDiscordId });
}

/**
 * サブアカウントの情報を doc ID から直接取得する。
 *
 * ID はメイン doc の `subAccountDiscordId` から得る。呼び出し側が既にメイン doc を
 * 読んでいる (設定ページの `getMember` など) 前提にすることで、同じ doc を
 * 二度読まずに済ませる。
 */
export async function getSubAccountById(
  subDiscordId: string,
): Promise<SubAccountInfo | null> {
  const db = getDb();
  const snap = await db.collection("members").doc(subDiscordId).get();
  if (!snap.exists) return null;

  const data = snap.data() ?? {};
  // サブアカウント以外の doc (通常のメンバー) を読み出させない
  if (data.isSubAccount !== true) return null;

  return {
    discordId: subDiscordId,
    discordUsername: data.discordUsername ?? "",
    discordHandle: data.discordHandle,
    discordAvatar: data.discordAvatar ?? "",
    linkedAt: (
      data.linkedAt as FirebaseFirestore.Timestamp | undefined
    )?.toMillis(),
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
