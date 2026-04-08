import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MemberDocument } from "@/lib/members";
import {
  calcProfileCompletion,
  buildWelcomeMessage,
  buildOnboardingCompleteMessage,
  buildLoginMessage,
  buildWelcomeBackMessage,
  sendDiscordDm,
} from "./discord-dm";

// Minimal valid MemberDocument for testing
function createMember(overrides: Partial<MemberDocument> = {}): MemberDocument {
  return {
    discordUsername: "testuser",
    discordAvatar: "avatar.png",
    studentId: "12345",
    nickname: "",
    lastName: "田中",
    firstName: "太郎",
    bio: "",
    visibility: {
      studentId: "private",
      nickname: "public",
      lastName: "public",
      firstName: "public",
      faculty: "public",
      currentOrg: "public",
      birthDate: "internal",
      gender: "internal",
      bio: "public",
      github: "public",
      x: "public",
      linkedin: "public",
      line: "internal",
      discord: "public",
    },
    createdAt: {} as FirebaseFirestore.Timestamp,
    updatedAt: {} as FirebaseFirestore.Timestamp,
    ...overrides,
  };
}

describe("calcProfileCompletion", () => {
  it("全項目未入力の場合、0%を返す", () => {
    const member = createMember();
    const result = calcProfileCompletion(member);

    expect(result.percentage).toBe(0);
    expect(result.filledCount).toBe(0);
    expect(result.totalCount).toBe(9);
    expect(result.missingFields).toHaveLength(9);
  });

  it("全項目入力済みの場合、100%を返す", () => {
    const member = createMember({
      bio: "こんにちは",
      faceImage: "https://example.com/face.jpg",
      github: "testuser",
      x: "testuser",
      linkedin: "https://linkedin.com/in/testuser",
      interests: ["web"],
      birthDate: "2000-01-01",
      nickname: "テスト",
      gender: "male",
    });
    const result = calcProfileCompletion(member);

    expect(result.percentage).toBe(100);
    expect(result.filledCount).toBe(9);
    expect(result.totalCount).toBe(9);
    expect(result.missingFields).toHaveLength(0);
  });

  it("一部入力済みの場合、正しい充足率を返す", () => {
    const member = createMember({
      bio: "自己紹介",
      github: "testuser",
      nickname: "テスト",
    });
    const result = calcProfileCompletion(member);

    expect(result.filledCount).toBe(3);
    expect(result.totalCount).toBe(9);
    expect(result.percentage).toBe(33); // Math.round(3/9 * 100)
    expect(result.missingFields).toContain("プロフィール顔写真");
    expect(result.missingFields).toContain("X (Twitter)");
    expect(result.missingFields).not.toContain("自己紹介");
    expect(result.missingFields).not.toContain("GitHub");
    expect(result.missingFields).not.toContain("ニックネーム");
  });

  it("空配列のinterestsは未入力と判定する", () => {
    const member = createMember({ interests: [] });
    const result = calcProfileCompletion(member);

    expect(result.missingFields).toContain("興味分野");
  });

  it("空文字のbioは未入力と判定する", () => {
    const member = createMember({ bio: "" });
    const result = calcProfileCompletion(member);

    expect(result.missingFields).toContain("自己紹介");
  });
});

describe("buildWelcomeMessage", () => {
  it("正しいEmbed構造を返す", () => {
    const payload = buildWelcomeMessage("テストユーザー");

    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toContain("Lumosへようこそ");
    expect(payload.embeds[0].description).toContain("テストユーザー");
    expect(payload.embeds[0].color).toBe(0xfee75c);
    expect(payload.embeds[0].thumbnail?.url).toBeTruthy();
    expect(payload.embeds[0].footer?.text).toContain("Lumos");
  });

  it("オンボーディングへのリンクボタンを含む", () => {
    const payload = buildWelcomeMessage("テスト");

    expect(payload.components).toHaveLength(1);
    const button = payload.components![0].components[0];
    expect(button.type).toBe(2);
    expect(button.style).toBe(5);
    expect(button.label).toBe("オンボーディングへLet's Go!");
    expect(button.url).toContain("/onboarding");
  });
});

describe("buildOnboardingCompleteMessage", () => {
  it("正しいEmbed構造を返す", () => {
    const completion = {
      percentage: 67,
      filledCount: 6,
      totalCount: 9,
      missingFields: ["自己紹介", "プロフィール顔写真", "興味分野"],
    };
    const payload = buildOnboardingCompleteMessage(
      "テストユーザー",
      completion,
    );

    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toBe("🎉 オンボーディング完了！");
    expect(payload.embeds[0].color).toBe(0x57f287);
  });

  it("充足率フィールドを含む", () => {
    const completion = {
      percentage: 67,
      filledCount: 6,
      totalCount: 9,
      missingFields: ["自己紹介"],
    };
    const payload = buildOnboardingCompleteMessage("テスト", completion);
    const fields = payload.embeds[0].fields!;

    expect(fields[0].name).toBe("📊 プロフィール充足率");
    expect(fields[0].value).toContain("67%");
    expect(fields[0].value).toContain("6/9");
  });

  it("未入力項目がある場合、フィールドに表示する", () => {
    const completion = {
      percentage: 67,
      filledCount: 6,
      totalCount: 9,
      missingFields: ["自己紹介", "プロフィール顔写真"],
    };
    const payload = buildOnboardingCompleteMessage("テスト", completion);
    const fields = payload.embeds[0].fields!;

    expect(fields).toHaveLength(2);
    expect(fields[1].name).toBe("📝 未入力の項目");
    expect(fields[1].value).toContain("・自己紹介");
    expect(fields[1].value).toContain("・プロフィール顔写真");
  });

  it("全項目入力済みの場合、未入力フィールドを表示しない", () => {
    const completion = {
      percentage: 100,
      filledCount: 9,
      totalCount: 9,
      missingFields: [],
    };
    const payload = buildOnboardingCompleteMessage("テスト", completion);
    const fields = payload.embeds[0].fields!;

    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("📊 プロフィール充足率");
  });

  it("設定ページへのリンクボタンを含む", () => {
    const completion = {
      percentage: 100,
      filledCount: 9,
      totalCount: 9,
      missingFields: [],
    };
    const payload = buildOnboardingCompleteMessage("テスト", completion);

    expect(payload.components).toHaveLength(1);
    const button = payload.components![0].components[0];
    expect(button.label).toBe("プロフィールを充実させる");
    expect(button.url).toContain("/internal/settings");
  });
});

describe("buildLoginMessage", () => {
  it("正しいEmbed構造を返す", () => {
    const payload = buildLoginMessage("テストユーザー");

    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0].title).toContain("ログイン");
    expect(payload.embeds[0].description).toContain("テストユーザー");
    expect(payload.embeds[0].color).toBe(0x5865f2);
  });

  it("ボタンを含まない", () => {
    const payload = buildLoginMessage("テスト");
    expect(payload.components).toBeUndefined();
  });
});

describe("buildWelcomeBackMessage", () => {
  it("未入力項目がある場合、プロフィール案内を含む", () => {
    const completion = {
      percentage: 44,
      filledCount: 4,
      totalCount: 9,
      missingFields: [
        "自己紹介",
        "プロフィール顔写真",
        "興味分野",
        "生年月日",
        "性別",
      ],
    };
    const payload = buildWelcomeBackMessage(
      "テストユーザー",
      "123456789",
      completion,
    );

    expect(payload.embeds[0].title).toContain("おかえり");
    expect(payload.embeds[0].color).toBe(0xeb459e);
    expect(payload.embeds[0].description).toContain("久しぶり");
    expect(payload.embeds[0].fields).toHaveLength(2);
    expect(payload.embeds[0].fields![0].value).toContain("44%");
    expect(payload.embeds[0].fields![1].value).toContain("・自己紹介");
    expect(payload.components).toHaveLength(1);
    const buttons = payload.components![0].components;
    expect(buttons).toHaveLength(2);
    expect(buttons[0].label).toBe("✨プロフィールを充実させる");
    expect(buttons[1].label).toBe("👀自分のプロフィールを確認する");
  });

  it("全項目入力済みの場合、プロフィール見直しを案内する", () => {
    const completion = {
      percentage: 100,
      filledCount: 9,
      totalCount: 9,
      missingFields: [],
    };
    const payload = buildWelcomeBackMessage("テスト", "987654321", completion);

    expect(payload.embeds[0].description).toContain("見直してみませんか");
    expect(payload.embeds[0].fields).toBeUndefined();
    expect(payload.components).toHaveLength(1);
    const button = payload.components![0].components[0];
    expect(button.label).toBe("👀自分のプロフィールを確認する");
    expect(button.url).toContain("/internal/members?member=987654321");
  });
});

describe("sendDiscordDm", () => {
  beforeEach(() => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");
    vi.restoreAllMocks();
  });

  it("DMチャンネル作成とメッセージ送信を行う", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "channel-123" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "msg-456" }), { status: 200 }),
      );

    await sendDiscordDm("user-123", buildWelcomeMessage("テスト"));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // First call: create DM channel
    expect(fetchSpy.mock.calls[0][0]).toContain("/users/@me/channels");
    // Second call: send message
    expect(fetchSpy.mock.calls[1][0]).toContain(
      "/channels/channel-123/messages",
    );
  });

  it("DMチャンネル作成失敗時にエラーを投げる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Forbidden", { status: 403 }),
    );

    await expect(
      sendDiscordDm("user-123", buildWelcomeMessage("テスト")),
    ).rejects.toThrow("Failed to create DM channel: 403");
  });
});
