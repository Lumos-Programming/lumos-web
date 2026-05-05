import { describe, it, expect, beforeEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  linkSubAccount,
  unlinkSubAccount,
  getSubAccount,
  isSubAccountDiscordId,
} from "./sub-account";

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
  avatar: "https://example.com/sub.png",
};

async function clearMembers() {
  const snap = await db.collection("members").get();
  for (const doc of snap.docs) await doc.ref.delete();
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

describe("getSubAccount / isSubAccountDiscordId", () => {
  beforeEach(async () => {
    await clearMembers();
    await seedPrimary(PRIMARY);
  });

  it("returns null when no sub-account is linked", async () => {
    expect(await getSubAccount(PRIMARY)).toBeNull();
  });

  it("returns the sub-account info after linking", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
    const info = await getSubAccount(PRIMARY);
    expect(info?.discordId).toBe(SUB);
    expect(info?.discordUsername).toBe("Sub User");
    expect(info?.discordHandle).toBe("subuser");
  });

  it("isSubAccountDiscordId returns true only for sub-account ids", async () => {
    await linkSubAccount({ primaryDiscordId: PRIMARY, sub: SUB_PROFILE });
    expect(await isSubAccountDiscordId(SUB)).toBe(true);
    expect(await isSubAccountDiscordId(PRIMARY)).toBe(false);
    expect(await isSubAccountDiscordId("nonexistent")).toBe(false);
  });
});
