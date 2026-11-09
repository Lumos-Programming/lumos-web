import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDiscordChannelMessage } from "@/lib/discord-dm";
import {
  buildRankingNotification,
  notifyRankingChannel,
} from "./ranking-notification";

vi.mock("@/lib/discord-dm", () => ({ sendDiscordChannelMessage: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(sendDiscordChannelMessage).mockReset();
});

describe("buildRankingNotification", () => {
  it("mentions every honoree with rank and points", () => {
    const payload = buildRankingNotification(
      {
        month: "2026-12",
        finalizedAt: "",
        entries: [],
        honorees: [
          { memberId: "111", points: 30, rank: 1 },
          { memberId: "222", points: 20, rank: 2 },
          { memberId: "333", points: 20, rank: 2 },
        ],
      },
      "https://x/internal/ranking",
    );
    const embed = payload.embeds![0];
    expect(embed.title).toContain("2026年12月");
    expect(embed.description).toContain("**1位** <@111> (30 pt)");
    expect(embed.description).toContain("**2位** <@222> (20 pt)");
    expect(embed.description).toContain("**2位** <@333> (20 pt)");
    expect(embed.description).toContain("アメニティは運営から後日お渡しします");
    expect(embed.description).toContain("https://x/internal/ranking");
  });
});

describe("notifyRankingChannel", () => {
  const payload = { embeds: [{ title: "x", description: "", color: 0 }] };

  it("posts to RANKING_NOTIFICATION_CHANNEL_ID when set", async () => {
    vi.stubEnv("RANKING_NOTIFICATION_CHANNEL_ID", "rank");
    vi.stubEnv("LOTTERY_NOTIFICATION_CHANNEL_ID", "loto");
    expect(await notifyRankingChannel(payload)).toBe(true);
    expect(sendDiscordChannelMessage).toHaveBeenCalledWith("rank", payload);
  });

  it("falls back to LOTTERY_NOTIFICATION_CHANNEL_ID", async () => {
    vi.stubEnv("RANKING_NOTIFICATION_CHANNEL_ID", "  ");
    vi.stubEnv("LOTTERY_NOTIFICATION_CHANNEL_ID", "loto");
    expect(await notifyRankingChannel(payload)).toBe(true);
    expect(sendDiscordChannelMessage).toHaveBeenCalledWith("loto", payload);
  });

  it("skips when neither channel is configured", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("RANKING_NOTIFICATION_CHANNEL_ID", "");
    vi.stubEnv("LOTTERY_NOTIFICATION_CHANNEL_ID", "");
    expect(await notifyRankingChannel(payload)).toBe(false);
    expect(sendDiscordChannelMessage).not.toHaveBeenCalled();
  });
});
