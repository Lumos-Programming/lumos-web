import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { refreshSingleMemberDiscordAvatar } from "./discord-avatar";

// Initialize Firebase for tests (emulator)
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = firebaseAdmin.firestore();

async function seedMember(
  discordId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db.collection("members").doc(discordId).set(data);
}

async function getDiscordAvatar(
  discordId: string,
): Promise<string | undefined> {
  const snap = await db.collection("members").doc(discordId).get();
  return snap.data()?.discordAvatar as string | undefined;
}

function userResponse(avatar: string | null): Response {
  return new Response(JSON.stringify({ id: "U-discord-id", avatar }), {
    status: 200,
  });
}

describe("refreshSingleMemberDiscordAvatar", () => {
  const discordId = "discord-1";

  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubEnv("DISCORD_BOT_TOKEN", "test-bot-token");
    const docs = await db.collection("members").listDocuments();
    for (const doc of docs) await doc.delete();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("hash が変わっていれば discordAvatar を更新する", async () => {
    await seedMember(discordId, { discordAvatar: "old_hash" });
    fetchMock.mockResolvedValueOnce(userResponse("new_hash"));

    const result = await refreshSingleMemberDiscordAvatar({
      discordId,
      discordAvatar: "old_hash",
    });

    expect(result.status).toBe("updated");
    expect(await getDiscordAvatar(discordId)).toBe("new_hash");
  });

  it("完全URL が保存された旧データも最新 hash に移行する", async () => {
    const legacyUrl =
      "https://cdn.discordapp.com/avatars/discord-1/old_hash.png";
    await seedMember(discordId, { discordAvatar: legacyUrl });
    fetchMock.mockResolvedValueOnce(userResponse("new_hash"));

    const result = await refreshSingleMemberDiscordAvatar({
      discordId,
      discordAvatar: legacyUrl,
    });

    expect(result.status).toBe("updated");
    expect(await getDiscordAvatar(discordId)).toBe("new_hash");
  });

  it("hash に変化がなければ書き込みをスキップする", async () => {
    await seedMember(discordId, { discordAvatar: "same_hash" });
    fetchMock.mockResolvedValueOnce(userResponse("same_hash"));

    const result = await refreshSingleMemberDiscordAvatar({
      discordId,
      discordAvatar: "same_hash",
    });

    expect(result.status).toBe("skipped");
  });

  it("アバター未設定 (null) は空文字として扱う", async () => {
    await seedMember(discordId, { discordAvatar: "old_hash" });
    fetchMock.mockResolvedValueOnce(userResponse(null));

    const result = await refreshSingleMemberDiscordAvatar({
      discordId,
      discordAvatar: "old_hash",
    });

    expect(result.status).toBe("updated");
    expect(await getDiscordAvatar(discordId)).toBe("");
  });

  it("ユーザーが見つからない (404) ならスキップする", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    const result = await refreshSingleMemberDiscordAvatar({
      discordId,
      discordAvatar: "old_hash",
    });

    expect(result.status).toBe("skipped");
  });

  it("API エラー時は failed を返し全体は継続できる", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    const result = await refreshSingleMemberDiscordAvatar({
      discordId,
      discordAvatar: "old_hash",
    });

    expect(result.status).toBe("failed");
  });
});
