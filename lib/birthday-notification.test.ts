import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJstToday } from "@/lib/date";
import {
  buildBirthdayNotification,
  notifyBirthdayChannel,
} from "./birthday-notification";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "message-id" }),
    } satisfies Partial<Response>),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("buildBirthdayNotification", () => {
  // 2026-09-05 JST
  const today = getJstToday(new Date("2026-09-05T00:00:00Z"));

  it("1人の場合、タイトルに日付を入れ、本文はメンション1件だけにする", () => {
    const payload = buildBirthdayNotification(["123456789"], today);

    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toBe("9月5日の誕生日!! Happy Birthday🎂");
    expect(payload.embeds[0].description).toBe("<@123456789>");
    expect(payload.embeds[0].color).toBe(0xf59e0b);
  });

  it("複数人の場合、メンションを改行で並べる", () => {
    const payload = buildBirthdayNotification(["111", "222", "333"], today);

    expect(payload.embeds[0].description).toBe("<@111>\n<@222>\n<@333>");
  });

  it("日付は0埋めせず「9月5日」の形にする", () => {
    const newYear = getJstToday(new Date("2026-01-01T00:00:00Z"));
    const payload = buildBirthdayNotification(["1"], newYear);

    expect(payload.embeds[0].title).toBe("1月1日の誕生日!! Happy Birthday🎂");
  });

  it("本文にメンション以外の文言を持たない", () => {
    const payload = buildBirthdayNotification(["123456789"], today);

    expect(payload.embeds[0].description).not.toMatch(/[ぁ-んァ-ヶ一-龠]/);
  });

  it("ボタンを含まない", () => {
    const payload = buildBirthdayNotification(["123456789"], today);
    expect(payload.components).toBeUndefined();
  });
});

describe("notifyBirthdayChannel", () => {
  const payload = buildBirthdayNotification(
    ["123456789"],
    getJstToday(new Date("2026-09-05T00:00:00Z")),
  );

  it("設定されたチャンネルへ既存のBotで送る", async () => {
    vi.stubEnv("BIRTHDAY_NOTIFICATION_CHANNEL_ID", "123456789012345678");
    vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");

    await notifyBirthdayChannel(payload);

    expect(fetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/channels/123456789012345678/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bot test-bot-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
  });

  it("チャンネルIDが未設定なら送信しない", async () => {
    vi.stubEnv("BIRTHDAY_NOTIFICATION_CHANNEL_ID", "");
    vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");

    await expect(notifyBirthdayChannel(payload)).rejects.toThrow(
      "BIRTHDAY_NOTIFICATION_CHANNEL_ID is not configured",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
