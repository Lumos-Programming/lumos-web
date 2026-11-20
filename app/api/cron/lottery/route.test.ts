import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  runDraw: vi.fn(),
  notifyLotteryChannel: vi.fn(),
}));
vi.mock("@/lib/lottery", () => ({ runDraw: mocks.runDraw }));
vi.mock("@/lib/lottery-notification", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/lottery-notification")>()),
  notifyLotteryChannel: mocks.notifyLotteryChannel,
}));

const draw = (participants: number) => ({
  drawId: "2026-11-13",
  drawnAt: "2026-11-13T08:30:00.000Z",
  totalTickets: participants,
  participants,
  winners:
    participants > 0
      ? [{ memberId: "a", tier: 1, tickets: 1, delivered: false }]
      : [],
});

const req = (authorization = "Bearer s") =>
  new NextRequest("https://example.test/api/cron/lottery", {
    headers: { authorization },
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T17:30:00+09:00"));
  vi.stubEnv("CRON_SECRET", "s");
  vi.stubEnv("AUTH_URL", "https://lumos.example");
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.runDraw.mockResolvedValue({ draw: draw(3), created: true });
  mocks.notifyLotteryChannel.mockResolvedValue(true);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/lottery", () => {
  it("returns 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req())).status).toBe(500);
    expect(mocks.runDraw).not.toHaveBeenCalled();
  });

  it.each(["", "Bearer wrong", "s"])("rejects authorization %j", async (h) => {
    expect((await GET(req(h))).status).toBe(401);
    expect(mocks.runDraw).not.toHaveBeenCalled();
  });

  it("draws the week that just closed and notifies once", async () => {
    const res = await GET(req());
    expect(mocks.runDraw).toHaveBeenCalledWith("2026-11-13");
    expect(mocks.notifyLotteryChannel).toHaveBeenCalledTimes(1);
    const text = JSON.stringify(mocks.notifyLotteryChannel.mock.calls[0][0]);
    expect(text).toContain("<@a>");
    expect(text).toContain("https://lumos.example/internal/lottery");
    expect(await res.json()).toMatchObject({ created: true, notified: true });
  });

  it("does not notify again when already drawn", async () => {
    mocks.runDraw.mockResolvedValue({ draw: draw(3), created: false });
    await GET(req());
    expect(mocks.notifyLotteryChannel).not.toHaveBeenCalled();
  });

  it("does not notify when nobody joined", async () => {
    mocks.runDraw.mockResolvedValue({ draw: draw(0), created: true });
    await GET(req());
    expect(mocks.notifyLotteryChannel).not.toHaveBeenCalled();
  });

  it("still succeeds when the Discord post fails", async () => {
    mocks.notifyLotteryChannel.mockRejectedValue(new Error("discord down"));
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect((await res.json()).notified).toBe(false);
  });

  it("returns 500 when the draw fails", async () => {
    mocks.runDraw.mockRejectedValue(new Error("firestore down"));
    expect((await GET(req())).status).toBe(500);
    expect(mocks.notifyLotteryChannel).not.toHaveBeenCalled();
  });
});
