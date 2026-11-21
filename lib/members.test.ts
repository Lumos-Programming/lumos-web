import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { getMemberIdByGithubId } from "./members";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = () => firebaseAdmin.firestore();

beforeEach(async () => {
  const docs = await db().collection("members").listDocuments();
  await Promise.all(docs.map((d) => d.delete()));
});

describe("getMemberIdByGithubId", () => {
  it("returns the Discord ID of the member linked to the GitHub ID", async () => {
    await db().collection("members").doc("alice").set({ githubId: "100" });
    await db().collection("members").doc("bob").set({ githubId: "200" });
    expect(await getMemberIdByGithubId("200")).toBe("bob");
  });

  it("accepts a numeric ID as delivered by GitHub webhooks", async () => {
    await db().collection("members").doc("alice").set({ githubId: "100" });
    expect(await getMemberIdByGithubId(100)).toBe("alice");
  });

  it("returns null when no member is linked", async () => {
    await db().collection("members").doc("alice").set({ githubId: "100" });
    expect(await getMemberIdByGithubId("999")).toBeNull();
  });

  it.each(["", "  ", "abc", "12a", "-1", "1.5"])(
    "returns null for a non-numeric ID %j",
    async (input) => {
      await db().collection("members").doc("alice").set({ githubId: "abc" });
      expect(await getMemberIdByGithubId(input)).toBeNull();
    },
  );

  it("excludes opted-out members", async () => {
    await db()
      .collection("members")
      .doc("left")
      .set({ githubId: "100", optedOut: true });
    expect(await getMemberIdByGithubId("100")).toBeNull();
  });

  it("excludes sub-account docs and picks the active member", async () => {
    await db()
      .collection("members")
      .doc("sub")
      .set({ githubId: "100", isSubAccount: true });
    await db().collection("members").doc("main").set({ githubId: "100" });
    expect(await getMemberIdByGithubId("100")).toBe("main");
  });
});
