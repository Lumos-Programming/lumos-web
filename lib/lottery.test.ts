import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  getLotteryStatus,
  grantTicket,
  listTickets,
  pickWinners,
  runDraw,
} from "./lottery";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = () => firebaseAdmin.firestore();
const jst = (local: string) => new Date(`${local}+09:00`);

/** 再現可能な乱数 (mulberry32) */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tickets = (...ids: string[]) => ids.map((memberId) => ({ memberId }));

describe("pickWinners", () => {
  it("returns no winners without tickets", () => {
    expect(pickWinners([], seeded(1))).toEqual([]);
  });

  it("lets one member win only once regardless of ticket count", () => {
    expect(pickWinners(tickets("a", "a", "a"), seeded(1))).toEqual([
      { memberId: "a", tier: 1, tickets: 3, delivered: false },
    ]);
  });

  it("fills 1 + 3 + 5 slots with distinct members", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `m${i}`);
    const winners = pickWinners(tickets(...ids, ...ids), seeded(2));
    expect(winners.map((w) => w.tier)).toEqual([1, 2, 2, 2, 3, 3, 3, 3, 3]);
    expect(new Set(winners.map((w) => w.memberId)).size).toBe(9);
    expect(winners.every((w) => w.tickets === 2)).toBe(true);
    // 3 等はポイントで渡すので受け渡し済み扱い
    expect(winners.map((w) => w.delivered)).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("gives fewer winners than slots when participants are few", () => {
    const winners = pickWinners(tickets("a", "b", "c"), seeded(3));
    expect(winners.map((w) => w.tier)).toEqual([1, 2, 2]);
  });

  it("weights the 1st prize by ticket count (3 tickets vs 1 → 75%)", () => {
    const random = seeded(42);
    const runs = 20000;
    let aFirst = 0;
    for (let i = 0; i < runs; i++) {
      if (pickWinners(tickets("a", "a", "a", "b"), random)[0].memberId === "a")
        aFirst++;
    }
    expect(aFirst / runs).toBeGreaterThan(0.73);
    expect(aFirst / runs).toBeLessThan(0.77);
  });

  it("does not mutate the input", () => {
    const input = tickets("a", "b", "c");
    pickWinners(input, seeded(5));
    expect(input).toEqual(tickets("a", "b", "c"));
  });
});

describe("with Firestore", () => {
  beforeEach(async () => {
    for (const c of ["lotteryTickets", "lotteryDraws", "pointTransactions"]) {
      await db().recursiveDelete(db().collection(c));
    }
  });

  describe("grantTicket", () => {
    it("assigns the ticket to the upcoming Friday", async () => {
      expect(
        await grantTicket(
          { key: "t1", memberId: "a" },
          jst("2026-11-13T16:59:00"),
        ),
      ).toEqual({ granted: true, drawId: "2026-11-13" });
      expect(
        await grantTicket(
          { key: "t2", memberId: "a" },
          jst("2026-11-13T17:00:00"),
        ),
      ).toEqual({ granted: true, drawId: "2026-11-20" });
    });

    it("does not grant twice for the same key", async () => {
      await grantTicket({ key: "t1", memberId: "a" });
      expect((await grantTicket({ key: "t1", memberId: "b" })).granted).toBe(
        false,
      );
      const all = await db().collection("lotteryTickets").get();
      expect(all.size).toBe(1);
      expect(all.docs[0].data().memberId).toBe("a");
    });

    it.each(["", "a/b"])("rejects invalid key %j", async (key) => {
      await expect(grantTicket({ key, memberId: "a" })).rejects.toThrow();
    });
  });

  async function seedTickets(drawFriday: string, owners: string[]) {
    const at = jst(`${drawFriday}T10:00:00`);
    for (const [i, memberId] of owners.entries()) {
      await grantTicket({ key: `${drawFriday}-${i}`, memberId }, at);
    }
  }

  describe("runDraw", () => {
    it("draws only the tickets of that week and awards 3rd-prize points", async () => {
      const ids = Array.from({ length: 10 }, (_, i) => `m${i}`);
      await seedTickets("2026-11-13", ids);
      await seedTickets("2026-11-20", ["late"]);

      const { draw, created } = await runDraw(
        "2026-11-13",
        jst("2026-11-13T17:30:00"),
        seeded(7),
      );
      expect(created).toBe(true);
      expect(draw.totalTickets).toBe(10);
      expect(draw.participants).toBe(10);
      expect(draw.winners).toHaveLength(9);
      expect(draw.winners.some((w) => w.memberId === "late")).toBe(false);

      const third = draw.winners.filter((w) => w.tier === 3);
      const points = await db().collection("pointTransactions").get();
      expect(points.docs.map((d) => d.data().memberId).sort()).toEqual(
        third.map((w) => w.memberId).sort(),
      );
      expect(points.docs.every((d) => d.data().points === 20)).toBe(true);
      expect(points.docs[0].data().month).toBe("2026-11");
    });

    it("never changes the result once drawn", async () => {
      await seedTickets("2026-11-13", ["a", "b", "c", "d"]);
      const first = await runDraw("2026-11-13", new Date(), seeded(1));
      const second = await runDraw("2026-11-13", new Date(), seeded(999));
      expect(second.created).toBe(false);
      expect(second.draw).toEqual(first.draw);
    });

    it("keeps one result under concurrent calls", async () => {
      await seedTickets("2026-11-13", ["a", "b", "c", "d", "e", "f"]);
      const results = await Promise.all([
        runDraw("2026-11-13", new Date(), seeded(1)),
        runDraw("2026-11-13", new Date(), seeded(2)),
      ]);
      expect(results.filter((r) => r.created)).toHaveLength(1);
      expect(results[0].draw).toEqual(results[1].draw);
      const points = await db().collection("pointTransactions").get();
      expect(points.size).toBe(
        results[0].draw.winners.filter((w) => w.tier === 3).length,
      );
    });

    it("records an empty draw when nobody has tickets", async () => {
      const { draw, created } = await runDraw("2026-11-13");
      expect(created).toBe(true);
      expect(draw).toMatchObject({
        totalTickets: 0,
        participants: 0,
        winners: [],
      });
    });
  });

  describe("getLotteryStatus", () => {
    it("shows my tickets this week and the last result", async () => {
      await seedTickets("2026-11-06", ["me", "other"]);
      await runDraw("2026-11-06", new Date(), seeded(1));
      await seedTickets("2026-11-13", ["me", "other", "me"]);

      const status = await getLotteryStatus("me", jst("2026-11-09T12:00:00"));
      expect(status.currentDrawId).toBe("2026-11-13");
      expect(status.deadline).toBe(jst("2026-11-13T17:00:00").toISOString());
      expect(status.myTickets).toHaveLength(2);
      expect(status.totalTickets).toBe(3);
      expect(status.lastDraw?.drawId).toBe("2026-11-06");
      expect(await listTickets("2026-11-06")).toHaveLength(2);
    });

    it("returns null lastDraw before the first draw", async () => {
      const status = await getLotteryStatus("me", jst("2026-11-09T12:00:00"));
      expect(status.lastDraw).toBeNull();
      expect(status.myTickets).toEqual([]);
    });
  });
});
