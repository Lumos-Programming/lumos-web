import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  getMember,
  getOrCreateMember,
  getMembersInternal,
  getPublicMembers,
} from "./members";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = firebaseAdmin.firestore();
const DISCORD_ID = "123456789012345678";

describe("Discord MFA status", () => {
  beforeEach(async () => {
    const members = await db.collection("members").get();
    await Promise.all(members.docs.map((doc) => doc.ref.delete()));
  });

  it.each([true, false])(
    "stores %s on the first Discord login",
    async (enabled) => {
      const result = await getOrCreateMember(
        DISCORD_ID,
        "Member",
        "avatar-hash",
        "member",
        enabled,
      );

      const member = await getMember(DISCORD_ID);
      expect(result.isNewMember).toBe(true);
      expect(member?.discordMfaEnabled).toBe(enabled);
      expect(member?.discordMfaCheckedAt?.toMillis()).toBeGreaterThan(0);
    },
  );

  it.each([true, false])(
    "backfills %s for an existing member without changing their profile",
    async (enabled) => {
      const previousLogin = firebaseAdmin.firestore.Timestamp.fromDate(
        new Date("2026-01-01T00:00:00Z"),
      );
      await db.collection("members").doc(DISCORD_ID).set({
        nickname: "Existing member",
        onboardingCompleted: true,
        lastLoginAt: previousLogin,
      });

      const result = await getOrCreateMember(
        DISCORD_ID,
        "Member",
        "",
        undefined,
        enabled,
      );

      const member = await getMember(DISCORD_ID);
      expect(result).toEqual({
        isNewMember: false,
        lastLoginAt: previousLogin.toDate(),
      });
      expect(member?.discordMfaEnabled).toBe(enabled);
      expect(member?.discordMfaCheckedAt?.toMillis()).toBeGreaterThan(
        previousLogin.toMillis(),
      );
      expect(member?.nickname).toBe("Existing member");
      expect(member?.onboardingCompleted).toBe(true);
    },
  );

  it.each([true, false])(
    "updates a previously recorded %s status and its check time",
    async (previousStatus) => {
      const previousCheck = firebaseAdmin.firestore.Timestamp.fromDate(
        new Date("2026-01-01T00:00:00Z"),
      );
      await db.collection("members").doc(DISCORD_ID).set({
        discordMfaEnabled: previousStatus,
        discordMfaCheckedAt: previousCheck,
      });

      await getOrCreateMember(
        DISCORD_ID,
        "Member",
        "",
        undefined,
        !previousStatus,
      );

      const member = await getMember(DISCORD_ID);
      expect(member?.discordMfaEnabled).toBe(!previousStatus);
      expect(member?.discordMfaCheckedAt?.toMillis()).toBeGreaterThan(
        previousCheck.toMillis(),
      );
    },
  );

  it("keeps missing MFA unknown across logins", async () => {
    await getOrCreateMember(DISCORD_ID, "Member", "");
    await getOrCreateMember(DISCORD_ID, "Member", "");

    const member = await getMember(DISCORD_ID);
    expect(member).not.toHaveProperty("discordMfaEnabled");
    expect(member).not.toHaveProperty("discordMfaCheckedAt");
  });

  it.each([true, false])(
    "preserves a confirmed %s status when Discord omits MFA",
    async (enabled) => {
      await getOrCreateMember(DISCORD_ID, "Member", "", undefined, enabled);
      const previousCheck = (await getMember(DISCORD_ID))?.discordMfaCheckedAt;

      await getOrCreateMember(DISCORD_ID, "Member", "");

      const member = await getMember(DISCORD_ID);
      expect(member?.discordMfaEnabled).toBe(enabled);
      expect(member?.discordMfaCheckedAt).toEqual(previousCheck);
    },
  );

  it("does not expose MFA in public or ordinary member directories", async () => {
    await getOrCreateMember(DISCORD_ID, "Member", "", undefined, true);
    await db
      .collection("members")
      .doc(DISCORD_ID)
      .update({ onboardingCompleted: true });

    for (const members of [
      await getPublicMembers(),
      await getMembersInternal(),
    ]) {
      expect(members).toHaveLength(1);
      expect(members[0]).not.toHaveProperty("discordMfaEnabled");
      expect(members[0]).not.toHaveProperty("discordMfaCheckedAt");
    }
  });
});
