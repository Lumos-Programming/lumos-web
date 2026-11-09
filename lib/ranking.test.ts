import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { awardPoints } from "./points";
import {
  computeMonthlyRanking,
  finalizeMonthlyRanking,
  getMonthlyRanking,
  getRankingPageData,
  isExcludedFromRanking,
  previousJstMonthKey,
  rankTotals,
  selectHonorees,
  sumByMember,
} from "./ranking";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = () => firebaseAdmin.firestore();
const jst = (local: string) => new Date(`${local}+09:00`);
const totals = (obj: Record<string, number>) => new Map(Object.entries(obj));
const ranks = (obj: Record<string, number>) =>
  rankTotals(totals(obj)).map((e) => [e.memberId, e.rank]);

describe("rankTotals", () => {
  it("returns nothing for an empty month", () => {
    expect(rankTotals(new Map())).toEqual([]);
  });

  it("uses standard competition ranking (1, 2, 2, 4)", () => {
    expect(ranks({ a: 30, b: 20, c: 20, d: 10 })).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 2],
      ["d", 4],
    ]);
  });

  it("gives everyone rank 1 when tied at the top", () => {
    expect(ranks({ b: 5, a: 5, c: 1 })).toEqual([
      ["a", 1],
      ["b", 1],
      ["c", 3],
    ]);
  });

  it("does not rank zero or negative totals", () => {
    expect(ranks({ a: 0, b: -3, c: 1 })).toEqual([["c", 1]]);
  });

  it("orders ties by memberId so the result is stable", () => {
    const entries = rankTotals(totals({ z: 1, m: 1, a: 1 }));
    expect(entries.map((e) => e.memberId)).toEqual(["a", "m", "z"]);
  });
});

describe("selectHonorees", () => {
  const honorees = (obj: Record<string, number>, n?: number) =>
    selectHonorees(rankTotals(totals(obj)), n).map((e) => e.memberId);

  it("includes everyone tied at the boundary (30, 20, 20, 20, 10 → 4)", () => {
    expect(honorees({ a: 30, b: 20, c: 20, d: 20, e: 10 })).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("includes everyone tied at rank 3 (30, 20, 10, 10, 5 → 4)", () => {
    expect(honorees({ a: 30, b: 20, c: 10, d: 10, e: 5 })).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("stops after rank 3 when there is no tie", () => {
    expect(honorees({ a: 4, b: 3, c: 2, d: 1 })).toEqual(["a", "b", "c"]);
  });

  it("includes all when 4 members tie at rank 1", () => {
    expect(honorees({ a: 9, b: 9, c: 9, d: 9, e: 1 })).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("returns fewer than N when fewer members have points", () => {
    expect(honorees({ a: 3, b: 0 })).toEqual(["a"]);
    expect(honorees({})).toEqual([]);
  });

  it("respects a custom N", () => {
    expect(honorees({ a: 3, b: 2, c: 2 }, 1)).toEqual(["a"]);
  });
});

describe("sumByMember / isExcludedFromRanking", () => {
  it("sums points per member including negatives", () => {
    expect(
      sumByMember([
        { memberId: "a", points: 10 },
        { memberId: "b", points: 3 },
        { memberId: "a", points: -4 },
      ]),
    ).toEqual(totals({ a: 6, b: 3 }));
  });

  it("excludes opted-out members, sub-accounts and missing members", () => {
    expect(isExcludedFromRanking({})).toBe(false);
    expect(isExcludedFromRanking({ optedOut: false })).toBe(false);
    expect(isExcludedFromRanking({ optedOut: true })).toBe(true);
    expect(isExcludedFromRanking({ isSubAccount: true })).toBe(true);
    expect(isExcludedFromRanking(undefined)).toBe(true);
  });
});

describe("previousJstMonthKey", () => {
  it("returns the previous month in JST", () => {
    expect(previousJstMonthKey(jst("2026-12-01T09:00:00"))).toBe("2026-11");
  });

  it("rolls January back to December of the previous year", () => {
    expect(previousJstMonthKey(jst("2027-01-01T09:00:00"))).toBe("2026-12");
  });

  it("uses the JST date even when UTC is still the previous month", () => {
    // 2026-11-01 00:30 JST = 2026-10-31 15:30 UTC
    expect(previousJstMonthKey(jst("2026-11-01T00:30:00"))).toBe("2026-10");
  });
});

describe("with Firestore", () => {
  beforeEach(async () => {
    for (const c of ["pointTransactions", "monthlyRankings", "members"]) {
      await db().recursiveDelete(db().collection(c));
    }
    await Promise.all(
      ["a", "b", "c", "d"].map((id) =>
        db().collection("members").doc(id).set({ onboardingCompleted: true }),
      ),
    );
  });

  const award = (key: string, memberId: string, now: Date) =>
    awardPoints({ key, memberId, reason: "blog_published" }, now); // 5 pt

  describe("computeMonthlyRanking", () => {
    it("returns nothing for an empty month", async () => {
      expect(await computeMonthlyRanking("2026-10")).toEqual([]);
    });

    it("splits the month at JST midnight", async () => {
      // 10/31 23:30 JST (= 10/31 14:30 UTC) は 10 月、11/1 00:30 JST (= 10/31 15:30 UTC) は 11 月
      await award("k1", "a", jst("2026-10-31T23:30:00"));
      await award("k2", "b", jst("2026-11-01T00:30:00"));
      expect(await computeMonthlyRanking("2026-10")).toEqual([
        { memberId: "a", points: 5, rank: 1 },
      ]);
      expect(await computeMonthlyRanking("2026-11")).toEqual([
        { memberId: "b", points: 5, rank: 1 },
      ]);
    });

    it("excludes opted-out members, sub-accounts and unknown members", async () => {
      await db().collection("members").doc("b").update({ optedOut: true });
      await db().collection("members").doc("c").update({ isSubAccount: true });
      const now = jst("2026-11-05T12:00:00");
      for (const id of ["a", "b", "c", "ghost"]) await award(id, id, now);
      expect(
        (await computeMonthlyRanking("2026-11")).map((e) => e.memberId),
      ).toEqual(["a"]);
    });

    it("sums multiple transactions and ignores members at zero or below", async () => {
      const now = jst("2026-11-05T12:00:00");
      await award("a1", "a", now);
      await award("a2", "a", now);
      await award("b1", "b", now);
      await db()
        .collection("pointTransactions")
        .doc("manual-minus")
        .set({ memberId: "b", points: -5, month: "2026-11" });
      expect(await computeMonthlyRanking("2026-11")).toEqual([
        { memberId: "a", points: 10, rank: 1 },
      ]);
    });
  });

  describe("finalizeMonthlyRanking", () => {
    it("saves the ranking and honorees", async () => {
      const now = jst("2026-10-10T12:00:00");
      await award("a1", "a", now);
      await award("a2", "a", now);
      await award("b1", "b", now);
      const { ranking, created } = await finalizeMonthlyRanking(
        "2026-10",
        jst("2026-11-01T09:00:00"),
      );
      expect(created).toBe(true);
      expect(ranking.honorees.map((e) => e.memberId)).toEqual(["a", "b"]);
      expect(await getMonthlyRanking("2026-10")).toEqual(ranking);
    });

    it("never changes the result once finalized", async () => {
      await award("a1", "a", jst("2026-10-10T12:00:00"));
      const first = await finalizeMonthlyRanking("2026-10");
      // 確定後に遅れて付与されても結果は変わらない
      await award("b1", "b", jst("2026-10-20T12:00:00"));
      await award("b2", "b", jst("2026-10-20T12:00:00"));
      const second = await finalizeMonthlyRanking("2026-10");
      expect(second.created).toBe(false);
      expect(second.ranking).toEqual(first.ranking);
    });

    it("keeps one result under concurrent calls", async () => {
      await award("a1", "a", jst("2026-10-10T12:00:00"));
      const results = await Promise.all(
        Array.from({ length: 5 }, () => finalizeMonthlyRanking("2026-10")),
      );
      expect(results.filter((r) => r.created)).toHaveLength(1);
      const docs = await db().collection("monthlyRankings").get();
      expect(docs.size).toBe(1);
      for (const r of results) {
        expect(r.ranking.honorees).toEqual([
          { memberId: "a", points: 5, rank: 1 },
        ]);
      }
    });

    it("records an empty month", async () => {
      const { ranking, created } = await finalizeMonthlyRanking("2026-10");
      expect(created).toBe(true);
      expect(ranking.entries).toEqual([]);
      expect(ranking.honorees).toEqual([]);
    });
  });

  describe("getRankingPageData", () => {
    it("shows this month's live ranking and last month's result", async () => {
      await award("a1", "a", jst("2026-10-10T12:00:00"));
      await finalizeMonthlyRanking("2026-10");
      await award("b1", "b", jst("2026-11-05T12:00:00"));
      const data = await getRankingPageData(jst("2026-11-09T12:00:00"));
      expect(data.month).toBe("2026-11");
      expect(data.lastMonth).toBe("2026-10");
      expect(data.current.map((e) => e.memberId)).toEqual(["b"]);
      expect(data.lastRanking?.honorees.map((e) => e.memberId)).toEqual(["a"]);
    });

    it("returns null for last month before it is finalized", async () => {
      const data = await getRankingPageData(jst("2027-01-03T12:00:00"));
      expect(data.lastMonth).toBe("2026-12");
      expect(data.lastRanking).toBeNull();
    });
  });
});
