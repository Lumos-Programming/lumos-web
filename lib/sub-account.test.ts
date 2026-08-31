import { describe, it, expect, beforeEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  linkSubAccount,
  unlinkSubAccount,
  unlinkSubAccountOnOptout,
  getSubAccountById,
  isSubAccountDiscordId,
} from "./sub-account";
import { getMemberRegistrationStatus } from "./members";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = firebaseAdmin.firestore();

const PRIMARY = "primary-id";
const SUB = "sub-id";
const OTHER_PRIMARY = "other-primary-id";
const SUB_PROFILE = {
  discordId: SUB,
  username: "Sub User",
  handle: "subuser",
  avatar: "a1b2c3d4e5f6", // Discord の avatar hash
};

async function clearMembers() {
  const snap = await db.collection("members").get();
  for (const doc of snap.docs) await doc.ref.delete();
}

/**
 * Server Component から Client Component にそのまま渡せる値か (プレーンか) を検証する。
 * Firestore の Timestamp のようなクラスインスタンスが混ざると Next.js が実行時に弾くが、
 * 型チェックもビルドもすり抜けるため、テストで見張る。
 */
function findNonPlainValue(value: unknown, path = "root"): string | null {
  if (value === null || typeof value !== "object") return null;
  const proto = Object.getPrototypeOf(value);
  if (
    proto !== Object.prototype &&
    proto !== Array.prototype &&
    proto !== null
  ) {
    return `${path} is ${value.constructor?.name ?? "a class instance"}`;
  }
  for (const [key, child] of Object.entries(value)) {
    const found = findNonPlainValue(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

async function seedPrimary(id: string) {
  await db.collection("members").doc(id).set({
    discordUsername: "Primary",
    discordAvatar: "",
    onboardingCompleted: true,
  });
}

describe("linkSubAccount", () => {
  beforeEach(async () => {
    await clearMembers();
    await seedPrimary(PRIMARY);
  });

  it("links a sub-account to a primary account and creates the sub doc", async () => {
    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    expect(result.ok).toBe(true);

    const primaryDoc = await db.collection("members").doc(PRIMARY).get();
    expect(primaryDoc.data()?.subAccountDiscordId).toBe(SUB);

    const subDoc = await db.collection("members").doc(SUB).get();
    expect(subDoc.exists).toBe(true);
    expect(subDoc.data()?.isSubAccount).toBe(true);
    expect(subDoc.data()?.primaryDiscordId).toBe(PRIMARY);
    expect(subDoc.data()?.discordUsername).toBe("Sub User");
    expect(subDoc.data()?.discordHandle).toBe("subuser");
  });

  it("rejects linking the same Discord ID as the primary itself", async () => {
    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: { ...SUB_PROFILE, discordId: PRIMARY },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("self_link");
  });

  it("rejects linking when the sub is already a Lumos main member", async () => {
    await seedPrimary(SUB); // SUB already exists as a regular member
    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("already_member");
  });

  it("takes over a login-only stub left by the registration nudge DM", async () => {
    // 登録案内 DM からサブでログインしただけの doc (getOrCreateMember 相当)
    await db.collection("members").doc(SUB).set({
      discordUsername: "Sub User",
      discordAvatar: "",
      lastLoginAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
    });

    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    expect(result.ok).toBe(true);

    const subDoc = await db.collection("members").doc(SUB).get();
    expect(subDoc.data()?.isSubAccount).toBe(true);
    expect(subDoc.data()?.primaryDiscordId).toBe(PRIMARY);
  });

  it("takes over an opt-out stub and clears the leftover member flags", async () => {
    // 登録案内 DM の「継続しない」を押しただけの doc (markMemberOptedOut 相当)
    await db.collection("members").doc(SUB).set({
      optedOut: true,
      optedOutAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      onboardingCompleted: false,
    });

    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    expect(result.ok).toBe(true);

    const data = (await db.collection("members").doc(SUB).get()).data();
    expect(data?.isSubAccount).toBe(true);
    expect(data?.optedOut).toBeUndefined();
    expect(data?.optedOutAt).toBeUndefined();
    expect(data?.onboardingCompleted).toBeUndefined();
  });

  it("still refuses an account that is mid-onboarding with profile data", async () => {
    await db.collection("members").doc(SUB).set({
      discordUsername: "Real Person",
      studentId: "2312345",
      onboardingCompleted: false,
    });

    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("already_member");
  });

  it("rejects linking when the sub is already linked to another primary", async () => {
    await seedPrimary(OTHER_PRIMARY);
    await linkSubAccount({
      primaryDiscordId: OTHER_PRIMARY,
      sub: SUB_PROFILE,
    });
    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("already_linked_to_other");
  });

  it("rejects linking when primary already has a sub-account", async () => {
    await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: SUB_PROFILE,
    });
    const result = await linkSubAccount({
      primaryDiscordId: PRIMARY,
      sub: {
        discordId: "another-sub",
        username: "Another",
        avatar: "",
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("primary_has_sub");
  });
});

describe("unlinkSubAccount", () => {
  beforeEach(async () => {
    await clearMembers();
    await seedPrimary(PRIMARY);
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
  });

  it("removes the sub doc and clears subAccountDiscordId on primary", async () => {
    const result = await unlinkSubAccount({
      primaryDiscordId: PRIMARY,
      subDiscordId: SUB,
    });
    expect(result.ok).toBe(true);

    const primaryDoc = await db.collection("members").doc(PRIMARY).get();
    expect(primaryDoc.data()?.subAccountDiscordId).toBeUndefined();

    const subDoc = await db.collection("members").doc(SUB).get();
    expect(subDoc.exists).toBe(false);
  });

  it("rejects unlinking when the sub is not owned by the primary", async () => {
    await seedPrimary(OTHER_PRIMARY);
    const result = await unlinkSubAccount({
      primaryDiscordId: OTHER_PRIMARY,
      subDiscordId: SUB,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_linked");
  });
});

describe("getSubAccountById / isSubAccountDiscordId", () => {
  beforeEach(async () => {
    await clearMembers();
    await seedPrimary(PRIMARY);
  });

  it("returns null when the doc does not exist", async () => {
    expect(await getSubAccountById("nonexistent")).toBeNull();
  });

  it("returns null for a normal member doc, not sub-account data", async () => {
    // doc ID を直接受け取るので、メンバーの doc を読み出せてしまわないこと
    expect(await getSubAccountById(PRIMARY)).toBeNull();
  });

  it("exposes the sub-account id on the primary doc for callers to follow", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
    const primary = await db.collection("members").doc(PRIMARY).get();
    expect(primary.data()?.subAccountDiscordId).toBe(SUB);
  });

  it("returns the sub-account info after linking", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
    const info = await getSubAccountById(SUB);
    expect(info?.discordId).toBe(SUB);
    expect(info?.discordUsername).toBe("Sub User");
    expect(info?.discordHandle).toBe("subuser");
  });

  it("returns only plain values so it can cross the Server/Client Component boundary", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
    const info = await getSubAccountById(SUB);

    expect(findNonPlainValue(info)).toBeNull();
    // linkedAt は Firestore Timestamp ではなく Unix ms
    expect(typeof info?.linkedAt).toBe("number");
    expect(info!.linkedAt).toBeGreaterThan(0);
  });

  it("isSubAccountDiscordId returns true only for sub-account ids", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
    expect(await isSubAccountDiscordId(SUB)).toBe(true);
    expect(await isSubAccountDiscordId(PRIMARY)).toBe(false);
    expect(await isSubAccountDiscordId("nonexistent")).toBe(false);
  });
});

describe("unlinkSubAccountOnOptout", () => {
  beforeEach(async () => {
    await clearMembers();
    await seedPrimary(PRIMARY);
  });

  it("unlinks the sub-account when the primary opts out", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });

    await unlinkSubAccountOnOptout(PRIMARY);

    const primaryDoc = await db.collection("members").doc(PRIMARY).get();
    expect(primaryDoc.data()?.subAccountDiscordId).toBeUndefined();
    expect((await db.collection("members").doc(SUB).get()).exists).toBe(false);
  });

  it("does nothing when no sub-account is linked", async () => {
    await expect(unlinkSubAccountOnOptout(PRIMARY)).resolves.toBeUndefined();
  });
});

describe("getMemberRegistrationStatus with sub-accounts", () => {
  beforeEach(async () => {
    await clearMembers();
    await seedPrimary(PRIMARY);
  });

  it("reports sub-accounts separately instead of as unregistered members", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });

    const status = await getMemberRegistrationStatus();

    expect(status.subAccountIds.has(SUB)).toBe(true);
    expect(status.onboardingIds.has(SUB)).toBe(false);
    expect(status.registeredIds.has(SUB)).toBe(false);
    expect(status.optedOutIds.has(SUB)).toBe(false);
    // メイン側はこれまで通り登録済みとして扱われる
    expect(status.registeredIds.has(PRIMARY)).toBe(true);
  });
});
