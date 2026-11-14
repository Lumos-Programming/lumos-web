import { beforeEach, describe, expect, it, vi } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { getAdminMembers } from "./actions";

const mocks = vi.hoisted(() => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/auth", () => ({ isAdmin: mocks.isAdmin }));

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = firebaseAdmin.firestore();

beforeEach(async () => {
  mocks.isAdmin.mockReset();
  mocks.isAdmin.mockResolvedValue(true);
  const snap = await db.collection("members").get();
  for (const doc of snap.docs) await doc.ref.delete();
});

describe("getAdminMembers Discord MFA status", () => {
  it("keeps enabled, disabled, and unknown statuses distinct and serializes check timestamps", async () => {
    const checkedAt = firebaseAdmin.firestore.Timestamp.fromDate(
      new Date("2026-10-03T12:00:00Z"),
    );
    await Promise.all([
      db.collection("members").doc("enabled").set({
        discordMfaEnabled: true,
        discordMfaCheckedAt: checkedAt,
      }),
      db.collection("members").doc("disabled").set({
        discordMfaEnabled: false,
        discordMfaCheckedAt: checkedAt,
      }),
      db.collection("members").doc("unknown").set({}),
      db.collection("members").doc("invalid").set({
        discordMfaEnabled: "false",
      }),
      db.collection("members").doc("sub-account").set({
        isSubAccount: true,
        discordMfaEnabled: true,
      }),
    ]);

    const members = await getAdminMembers();

    expect(members).toHaveLength(4);
    expect(
      Object.fromEntries(
        members.map((member) => [
          member.discordId,
          {
            enabled: member.discordMfaEnabled,
            checkedAt: member.discordMfaCheckedAt,
          },
        ]),
      ),
    ).toEqual({
      enabled: { enabled: true, checkedAt: checkedAt.toMillis() },
      disabled: { enabled: false, checkedAt: checkedAt.toMillis() },
      unknown: { enabled: null, checkedAt: null },
      invalid: { enabled: null, checkedAt: null },
    });
  });

  it("requires administrator access on every request", async () => {
    await db.collection("members").doc("member").set({
      discordMfaEnabled: true,
    });
    await expect(getAdminMembers()).resolves.toHaveLength(1);

    mocks.isAdmin.mockResolvedValue(false);

    await expect(getAdminMembers()).rejects.toThrow("管理者権限が必要です");
    expect(mocks.isAdmin).toHaveBeenCalledTimes(2);
  });
});
