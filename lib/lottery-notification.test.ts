import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLotteryNotification,
  notifyLotteryChannel,
} from "./lottery-notification";

vi.mock("@/lib/discord-dm", () => ({ sendDiscordChannelMessage: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

describe("buildLotteryNotification", () => {
  it("lists winners by tier with mentions and skips empty tiers", () => {
    const payload = buildLotteryNotification(
      {
        drawId: "2026-11-13",
        drawnAt: "",
        totalTickets: 5,
        participants: 2,
        winners: [
          { memberId: "111", tier: 1, tickets: 3, delivered: false },
          { memberId: "222", tier: 2, tickets: 2, delivered: false },
        ],
      },
      "https://x/internal/lottery",
    );
    const embed = payload.embeds![0];
    expect(embed.title).toContain("11月13日");
    expect(embed.description).toContain("**1等**");
    expect(embed.description).toContain("<@111>");
    expect(embed.description).toContain("<@222>");
    expect(embed.description).not.toContain("3等");
    expect(embed.description).toContain("参加 2 人 / チケット 5 枚");
  });
});

describe("notifyLotteryChannel", () => {
  it("skips sending when the channel is not configured", async () => {
    vi.stubEnv("LOTTERY_NOTIFICATION_CHANNEL_ID", " ");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await notifyLotteryChannel({ embeds: [] })).toBe(false);
  });
});
