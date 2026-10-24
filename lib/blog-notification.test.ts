import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Blog } from "@/types/blog";
import { buildBlogNotification, notifyBlogChannel } from "./blog-notification";

const BLOG: Blog = {
  id: "blog-1",
  authorId: "123456789",
  url: "https://qiita.com/someone/items/abc",
  title: "記事タイトル",
  description: "記事の説明",
  thumbnailUrl: "https://img.example/a.png",
  publishedAt: "2026-10-20",
  platform: "Qiita",
  createdAt: 0,
};

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

describe("buildBlogNotification", () => {
  it("タイトルを元記事へのリンクにし、書いた人をメンションし、サムネイルを大きく出す", () => {
    const [embed] = buildBlogNotification(BLOG).embeds;

    expect(embed.title).toBe("記事タイトル");
    expect(embed.url).toBe("https://qiita.com/someone/items/abc");
    expect(embed.description).toBe(
      "<@123456789> さんが新しい記事を書きました！\n\n記事の説明",
    );
    expect(embed.fields).toEqual([
      { name: "媒体", value: "Qiita", inline: true },
      { name: "公開日", value: "2026-10-20", inline: true },
    ]);
    expect(embed.image).toEqual({ url: "https://img.example/a.png" });
  });

  it("説明・媒体・サムネイルが無ければ、その部分を出さない", () => {
    const [embed] = buildBlogNotification({
      ...BLOG,
      description: undefined,
      platform: undefined,
      thumbnailUrl: undefined,
    }).embeds;

    expect(embed.description).toBe(
      "<@123456789> さんが新しい記事を書きました！",
    );
    expect(embed.fields).toEqual([
      { name: "公開日", value: "2026-10-20", inline: true },
    ]);
    expect(embed).not.toHaveProperty("image");
  });

  it("長い説明は 200 文字で切って「…」を付ける (絵文字などのサロゲートペアを壊さない)", () => {
    const [embed] = buildBlogNotification({
      ...BLOG,
      description: "😀".repeat(300),
    }).embeds;
    const body = embed.description.split("\n\n")[1];

    expect(Array.from(body)).toHaveLength(200);
    expect(body.endsWith("😀…")).toBe(true);
  });

  it("ちょうど 200 文字の説明は切らない", () => {
    const description = "あ".repeat(200);
    const [embed] = buildBlogNotification({ ...BLOG, description }).embeds;

    expect(embed.description.split("\n\n")[1]).toBe(description);
  });

  it("Discord の上限 (256 文字) を超えるタイトルは切る", () => {
    const [embed] = buildBlogNotification({
      ...BLOG,
      title: "a".repeat(300),
    }).embeds;

    expect(embed.title).toHaveLength(256);
    expect(embed.title.endsWith("…")).toBe(true);
  });
});

describe("notifyBlogChannel", () => {
  it("設定されたチャンネルへ Bot で送る", async () => {
    vi.stubEnv("BLOG_NOTIFICATION_CHANNEL_ID", " 1563415197232795718 ");
    vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");
    const payload = buildBlogNotification(BLOG);

    await notifyBlogChannel(payload);

    expect(fetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/channels/1563415197232795718/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it.each(["", "   "])(
    "チャンネルが未設定 (%j) の環境では送らない",
    async (channelId) => {
      vi.stubEnv("BLOG_NOTIFICATION_CHANNEL_ID", channelId);
      vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");

      await notifyBlogChannel(buildBlogNotification(BLOG));

      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("Discord がエラーを返したら例外にする (呼び出し側でログに残す)", async () => {
    vi.stubEnv("BLOG_NOTIFICATION_CHANNEL_ID", "1563415197232795718");
    vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: vi.fn().mockResolvedValue("Missing Access"),
    } as unknown as Response);

    await expect(
      notifyBlogChannel(buildBlogNotification(BLOG)),
    ).rejects.toThrow();
  });
});
