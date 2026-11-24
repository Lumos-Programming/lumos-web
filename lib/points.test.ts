import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  awardPoints,
  getPointSummary,
  isValidPointKey,
  pointKeys,
  revokePoints,
} from "./points";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = () => firebaseAdmin.firestore();

beforeEach(async () => {
  await db().recursiveDelete(db().collection("pointTransactions"));
});

const award = (key: string, memberId = "alice", now?: Date) =>
  awardPoints(
    { key, memberId, reason: "github_pr_merged", description: key },
    now,
  );

describe("awardPoints", () => {
  it("awards points according to the rule", async () => {
    expect(await award("k1")).toEqual({ awarded: true });
    const snap = await db().collection("pointTransactions").doc("k1").get();
    expect(snap.data()).toMatchObject({
      memberId: "alice",
      points: 10,
      reason: "github_pr_merged",
      sourceUrl: "",
    });
  });

  it("does not award twice for the same key (webhook redelivery)", async () => {
    await award("k1");
    expect(await award("k1", "bob")).toEqual({ awarded: false });
    const snap = await db().collection("pointTransactions").doc("k1").get();
    expect(snap.data()!.memberId).toBe("alice");
  });

  it("awards exactly once under concurrent requests", async () => {
    const results = await Promise.all([award("k1"), award("k1"), award("k1")]);
    expect(results.filter((r) => r.awarded)).toHaveLength(1);
  });

  it("rejects keys that are not valid document IDs", async () => {
    await expect(award("a/b")).rejects.toThrow();
    await expect(award("")).rejects.toThrow();
  });
});

describe("revokePoints", () => {
  it("revokes an existing award and allows re-awarding", async () => {
    await award("k1");
    expect(await revokePoints("k1")).toEqual({ revoked: true });
    expect(await revokePoints("k1")).toEqual({ revoked: false });
    expect(await award("k1")).toEqual({ awarded: true });
  });
});

describe("getPointSummary", () => {
  it("returns zeros for a member without points", async () => {
    expect(await getPointSummary("nobody")).toEqual({
      total: 0,
      thisMonth: 0,
      history: [],
    });
  });

  it("sums total and this month in JST, newest first, per member", async () => {
    // 2026-10-31 23:30 JST → 10 月
    await award("oct", "alice", new Date("2026-10-31T14:30:00Z"));
    // 2026-11-01 00:30 JST → 11 月 (UTC ではまだ 10 月)
    await award("nov1", "alice", new Date("2026-10-31T15:30:00Z"));
    await award("nov2", "alice", new Date("2026-11-09T03:00:00Z"));
    await award("bob", "bob", new Date("2026-11-09T03:00:00Z"));

    const summary = await getPointSummary(
      "alice",
      new Date("2026-11-09T12:00:00Z"),
    );
    expect(summary.total).toBe(30);
    expect(summary.thisMonth).toBe(20);
    expect(summary.history.map((t) => t.key)).toEqual(["nov2", "nov1", "oct"]);
    expect(summary.history[0].month).toBe("2026-11");
    expect(summary.history[2].month).toBe("2026-10");
  });

  it("limits the history but not the totals", async () => {
    for (let i = 0; i < 3; i++) {
      await award(`k${i}`, "alice", new Date(Date.UTC(2026, 10, 1 + i)));
    }
    const summary = await getPointSummary(
      "alice",
      new Date("2026-11-09T00:00:00Z"),
      2,
    );
    expect(summary.history.map((t) => t.key)).toEqual(["k2", "k1"]);
    expect(summary.total).toBe(30);
  });
});

describe("point keys", () => {
  it("builds valid, distinct keys", () => {
    const keys = [
      pointKeys.githubPrMerged(1, 2),
      pointKeys.githubReviewApproved(1, 2, 3),
      pointKeys.blogPublished("b"),
      pointKeys.eventAttended("e", "m"),
    ];
    expect(new Set(keys).size).toBe(4);
    expect(keys.every(isValidPointKey)).toBe(true);
  });

  it.each(["", "a/b", "x".repeat(401)])("rejects %j", (key) => {
    expect(isValidPointKey(key)).toBe(false);
  });
});
