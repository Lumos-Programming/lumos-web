import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VisibilityLevel } from "@/types/profile";
import { GET } from "./route";

const getMembersSnapshot = vi.hoisted(() =>
  vi.fn<() => Promise<{ docs: ReturnType<typeof memberDocument>[] }>>(),
);

// getMembersInternal をモックすると公開範囲の判定を通らず、非公開の誕生日が
// 漏れる回帰を検知できないため、Firestore の読み取りだけを差し替える。
vi.mock("@/lib/firebase", () => ({
  getDb: () => ({
    collection: () => ({
      where: () => ({ get: getMembersSnapshot }),
    }),
  }),
}));

const fetchMock = vi.fn<typeof fetch>();

function memberDocument(id: string, birthDateVisibility: VisibilityLevel) {
  return {
    id,
    data: () => ({
      firstName: "Test",
      lastName: "Member",
      onboardingCompleted: true,
      birthDate: "2001-09-05",
      visibility: { birthDate: birthDateVisibility },
    }),
  };
}

function birthdayRequest() {
  return new NextRequest("https://example.test/api/cron/birthday", {
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T00:00:00Z"));
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  vi.stubEnv("BIRTHDAY_NOTIFICATION_CHANNEL_ID", "birthday-channel");
  vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");
  fetchMock.mockImplementation(async () => Response.json({ id: "message-id" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/cron/birthday privacy", () => {
  // 同じ誕生日で公開範囲だけが異なるメンバーを用意し、private のメンバーだけが
  // 通知から除外され、internal のメンバーは通知されることを確認する。
  it("excludes private birthdays while notifying members with shared birthdays on the same day", async () => {
    getMembersSnapshot.mockResolvedValue({
      docs: [
        memberDocument("private-member", "private"),
        memberDocument("internal-member", "internal"),
      ],
    });

    const response = await GET(birthdayRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      notified: true,
      count: 1,
      discordIds: ["internal-member"],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const requestBody = fetchMock.mock.calls[0][1]?.body;
    expect(requestBody).toContain("<@internal-member>");
    expect(requestBody).not.toContain("private-member");
  });

  // 今日が誕生日のメンバーが全員非公開なら、メンションのない通知も送信しない。
  it("does not send a notification when all birthdays today are private", async () => {
    getMembersSnapshot.mockResolvedValue({
      docs: [memberDocument("private-member", "private")],
    });

    const response = await GET(birthdayRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notified: false, count: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
