import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  finalizeMonthlyRanking: vi.fn(),
  notifyRankingChannel: vi.fn(),
}));
vi.mock("@/lib/ranking", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ranking")>()),
  finalizeMonthlyRanking: mocks.finalizeMonthlyRanking,
}));
vi.mock("@/lib/ranking-notification", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ranking-notification")>()),
  notifyRankingChannel: mocks.notifyRankingChannel,
}));

const ranking = (honorees: number) => ({
  month: "2026-10",
  finalizedAt: "2026-11-01T00:00:00.000Z",
  entries: Array.from({ length: honorees }, (_, i) => ({
    memberId: `m${i}`,
    points: 10,
    rank: 1,
  })),
  honorees: Array.from({ length: honorees }, (_, i) => ({
    memberId: `m${i}`,
    points: 10,
    rank: 1,
  })),
});

const req = (authorization = "Bearer s") =>
  new NextRequest("https://example.test/api/cron/monthly-ranking", {
    headers: { authorization },
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T09:00:00+09:00"));
  vi.stubEnv("CRON_SECRET", "s");
  vi.stubEnv("AUTH_URL", "https://lumos.example");
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.finalizeMonthlyRanking.mockResolvedValue({
    ranking: ranking(2),
    created: true,
  });
  mocks.notifyRankingChannel.mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/monthly-ranking", () => {
  it("returns 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req())).status).toBe(500);
    expect(mocks.finalizeMonthlyRanking).not.toHaveBeenCalled();
  });

  it.each(["", "Bearer wrong", "s"])("rejects authorization %j", async (h) => {
    expect((await GET(req(h))).status).toBe(401);
    expect(mocks.finalizeMonthlyRanking).not.toHaveBeenCalled();
  });

  it("finalizes the previous JST month and notifies once", async () => {
    const res = await GET(req());
    expect(mocks.finalizeMonthlyRanking).toHaveBeenCalledWith("2026-10");
    expect(mocks.notifyRankingChannel).toHaveBeenCalledTimes(1);
    const text = JSON.stringify(mocks.notifyRankingChannel.mock.calls[0][0]);
    expect(text).toContain("<@m0>");
    expect(text).toContain("<@m1>");
    expect(text).toContain("https://lumos.example/internal/ranking");
    expect(await res.json()).toMatchObject({
      month: "2026-10",
      created: true,
      honorees: 2,
      notified: true,
    });
  });

  it("finalizes December of the previous year in January", async () => {
    vi.setSystemTime(new Date("2027-01-01T09:00:00+09:00"));
    await GET(req());
    expect(mocks.finalizeMonthlyRanking).toHaveBeenCalledWith("2026-12");
  });

  it("does not notify again when already finalized", async () => {
    mocks.finalizeMonthlyRanking.mockResolvedValue({
      ranking: ranking(2),
      created: false,
    });
    const res = await GET(req());
    expect(mocks.notifyRankingChannel).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ created: false, notified: false });
  });

  it("does not notify when nobody earned points", async () => {
    mocks.finalizeMonthlyRanking.mockResolvedValue({
      ranking: ranking(0),
      created: true,
    });
    await GET(req());
    expect(mocks.notifyRankingChannel).not.toHaveBeenCalled();
  });

  it("still succeeds when the Discord post fails", async () => {
    mocks.notifyRankingChannel.mockRejectedValue(new Error("discord down"));
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).notified).toBe(false);
  });

  it("returns 500 when finalizing fails", async () => {
    mocks.finalizeMonthlyRanking.mockRejectedValue(new Error("firestore down"));
    expect((await GET(req())).status).toBe(500);
    expect(mocks.notifyRankingChannel).not.toHaveBeenCalled();
  });
});
