import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { refreshSingleMemberLineAvatar } from "./line-invite";

// Initialize Firebase for tests (emulator)
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = firebaseAdmin.firestore();

/** members コレクションに最小限のドキュメントを用意する */
async function seedMember(
  discordId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db.collection("members").doc(discordId).set(data);
}

async function getLineAvatar(discordId: string): Promise<string | undefined> {
  const snap = await db.collection("members").doc(discordId).get();
  return snap.data()?.lineAvatar as string | undefined;
}

function lineProfileResponse(pictureUrl: string): Response {
  return new Response(
    JSON.stringify({
      userId: "U-line-id",
      displayName: "テスト",
      pictureUrl,
    }),
    { status: 200 },
  );
}

function lineTokenResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 2592000,
      ...overrides,
    }),
    { status: 200 },
  );
}

describe("refreshSingleMemberLineAvatar", () => {
  const discordId = "discord-1";
  const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

  // 各テストで globalThis.fetch を新しい vi.fn() に差し替える。
  // 他テストファイルが残した mock キューと干渉しないよう、spyOn ではなく
  // 毎回まっさらな関数を割り当てて Once キューを共有しないようにする。
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubEnv("AUTH_LINE_ID", "line-client-id");
    vi.stubEnv("AUTH_LINE_SECRET", "line-client-secret");
    // Clear members collection
    const docs = await db.collection("members").listDocuments();
    for (const doc of docs) await doc.delete();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("画像が変わっていれば lineAvatar を更新する", async () => {
    await seedMember(discordId, {
      lineId: "U-line-id",
      lineAvatar: "https://old.example/pic.jpg",
      lineAccessToken: "valid-token",
      lineTokenExpiresAt: futureExpiry,
    });
    fetchMock.mockResolvedValueOnce(
      lineProfileResponse("https://new.example/pic.jpg"),
    );

    const result = await refreshSingleMemberLineAvatar({
      discordId,
      lineAvatar: "https://old.example/pic.jpg",
      lineAccessToken: "valid-token",
      lineTokenExpiresAt: futureExpiry,
    });

    expect(result.status).toBe("updated");
    expect(await getLineAvatar(discordId)).toBe("https://new.example/pic.jpg");
    // profile API のみ（リフレッシュ不要）
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("画像に変化がなければ書き込みをスキップする", async () => {
    await seedMember(discordId, {
      lineId: "U-line-id",
      lineAvatar: "https://same.example/pic.jpg",
      lineAccessToken: "valid-token",
      lineTokenExpiresAt: futureExpiry,
    });
    fetchMock.mockResolvedValueOnce(
      lineProfileResponse("https://same.example/pic.jpg"),
    );

    const result = await refreshSingleMemberLineAvatar({
      discordId,
      lineAvatar: "https://same.example/pic.jpg",
      lineAccessToken: "valid-token",
      lineTokenExpiresAt: futureExpiry,
    });

    expect(result.status).toBe("skipped");
  });

  it("トークン期限切れなら refresh_token で再発行してから取得する", async () => {
    const pastExpiry = Math.floor(Date.now() / 1000) - 10;
    await seedMember(discordId, {
      lineId: "U-line-id",
      lineAvatar: "https://old.example/pic.jpg",
      lineAccessToken: "expired-token",
      lineRefreshToken: "refresh-token",
      lineTokenExpiresAt: pastExpiry,
    });
    fetchMock
      // 1回目: token refresh
      .mockResolvedValueOnce(lineTokenResponse())
      // 2回目: profile 取得
      .mockResolvedValueOnce(
        lineProfileResponse("https://new.example/pic.jpg"),
      );

    const result = await refreshSingleMemberLineAvatar({
      discordId,
      lineAvatar: "https://old.example/pic.jpg",
      lineAccessToken: "expired-token",
      lineRefreshToken: "refresh-token",
      lineTokenExpiresAt: pastExpiry,
    });

    expect(result.status).toBe("updated");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // refresh で得た新トークンが保存されている
    const snap = await db.collection("members").doc(discordId).get();
    expect(snap.data()?.lineAccessToken).toBe("new-access-token");
    expect(snap.data()?.lineRefreshToken).toBe("new-refresh-token");
  });

  it("期限切れだが refresh_token が無ければスキップする", async () => {
    const pastExpiry = Math.floor(Date.now() / 1000) - 10;
    const result = await refreshSingleMemberLineAvatar({
      discordId,
      lineAvatar: "https://old.example/pic.jpg",
      lineAccessToken: "expired-token",
      lineTokenExpiresAt: pastExpiry,
    });

    expect(result.status).toBe("skipped");
  });

  it("profile 取得失敗時は failed を返し全体は継続できる", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401 }),
    );

    const result = await refreshSingleMemberLineAvatar({
      discordId,
      lineAvatar: "https://old.example/pic.jpg",
      lineAccessToken: "valid-token",
      lineTokenExpiresAt: futureExpiry,
    });

    expect(result.status).toBe("failed");
  });
});
