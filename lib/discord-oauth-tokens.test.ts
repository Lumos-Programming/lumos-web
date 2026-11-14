import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import {
  deleteDiscordOAuthTokens,
  getDiscordOAuthTokens,
  saveDiscordOAuthTokens,
} from "./discord-oauth-tokens";
import { getDb } from "./firebase";
import { getMember, getOrCreateMember, markMemberOptedOut } from "./members";

vi.mock("server-only", () => ({}));

const DISCORD_ID = "123456789012345678";
const tokens = {
  accessToken: "access-secret",
  refreshToken: "refresh-secret",
  expiresAt: 1791043200,
  scope: "identify guilds guilds.members.read",
  tokenType: "bearer",
};

beforeEach(async () => {
  for (const name of ["members", "discord_oauth_tokens"]) {
    const snap = await getDb().collection(name).get();
    await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
  }
  await getOrCreateMember(DISCORD_ID, "Member", "");
});

describe("Discord OAuth token storage", () => {
  it("stores credentials separately from the member profile", async () => {
    expect(await getDiscordOAuthTokens(DISCORD_ID)).toBeNull();

    await saveDiscordOAuthTokens(DISCORD_ID, tokens);

    const stored = await getDiscordOAuthTokens(DISCORD_ID);
    expect(stored).toMatchObject(tokens);
    expect(stored?.createdAt).toBeInstanceOf(Timestamp);
    expect(stored?.updatedAt).toBeInstanceOf(Timestamp);
    const member = JSON.stringify(await getMember(DISCORD_ID));
    expect(member).not.toContain(tokens.accessToken);
    expect(member).not.toContain(tokens.refreshToken);
    expect(await getDiscordOAuthTokens("another-member")).toBeNull();
  });

  it("replaces the full credential set on reauthentication", async () => {
    await saveDiscordOAuthTokens(DISCORD_ID, tokens);
    const createdAt = (await getDiscordOAuthTokens(DISCORD_ID))?.createdAt;
    const previousUpdate = Timestamp.fromMillis(1000);
    await getDb().collection("discord_oauth_tokens").doc(DISCORD_ID).update({
      updatedAt: previousUpdate,
    });

    await saveDiscordOAuthTokens(DISCORD_ID, {
      ...tokens,
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: tokens.expiresAt + 600,
    });

    const stored = await getDiscordOAuthTokens(DISCORD_ID);
    expect(stored).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: tokens.expiresAt + 600,
      createdAt,
    });
    expect(stored?.updatedAt.toMillis()).toBeGreaterThan(
      previousUpdate.toMillis(),
    );
  });

  it("does not carry metadata from an old grant into an incomplete new grant", async () => {
    await saveDiscordOAuthTokens(DISCORD_ID, tokens);
    await saveDiscordOAuthTokens(DISCORD_ID, { accessToken: "new-access" });

    const stored = await getDiscordOAuthTokens(DISCORD_ID);
    expect(stored?.accessToken).toBe("new-access");
    for (const field of ["refreshToken", "expiresAt", "scope", "tokenType"]) {
      expect(stored).not.toHaveProperty(field);
    }
  });

  it("deletes credentials idempotently", async () => {
    await saveDiscordOAuthTokens(DISCORD_ID, tokens);
    await deleteDiscordOAuthTokens(DISCORD_ID);
    await deleteDiscordOAuthTokens(DISCORD_ID);

    expect(await getDiscordOAuthTokens(DISCORD_ID)).toBeNull();
    expect(await getMember(DISCORD_ID)).not.toBeNull();
  });

  it("removes credentials on opt-out without deleting the profile", async () => {
    await saveDiscordOAuthTokens(DISCORD_ID, tokens);

    await markMemberOptedOut(DISCORD_ID);

    expect(await getDiscordOAuthTokens(DISCORD_ID)).toBeNull();
    expect(await getMember(DISCORD_ID)).toMatchObject({
      optedOut: true,
      discordUsername: "Member",
    });
  });

  it.each(["optedOut", "isSubAccount"])(
    "does not retain tokens for a member with %s set",
    async (flag) => {
      await saveDiscordOAuthTokens(DISCORD_ID, tokens);
      await getDb()
        .collection("members")
        .doc(DISCORD_ID)
        .update({ [flag]: true });

      await saveDiscordOAuthTokens(DISCORD_ID, tokens);

      expect(await getDiscordOAuthTokens(DISCORD_ID)).toBeNull();
    },
  );

  // エミュレーターでは同時書き込みのロック解放に最大 30 秒かかる。
  // https://firebase.google.com/docs/emulator-suite/connect_firestore#transactions
  it("does not recreate credentials when first login and opt-out overlap", async () => {
    await getDb().collection("members").doc(DISCORD_ID).delete();
    await Promise.all([
      (async () => {
        await getOrCreateMember(DISCORD_ID, "Member", "");
        await saveDiscordOAuthTokens(DISCORD_ID, tokens);
      })(),
      markMemberOptedOut(DISCORD_ID),
    ]);

    expect(await getDiscordOAuthTokens(DISCORD_ID)).toBeNull();
    expect((await getMember(DISCORD_ID))?.optedOut).toBe(true);
  }, 45_000);

  it("rejects credentials without a member record", async () => {
    await expect(
      saveDiscordOAuthTokens("unknown-member", tokens),
    ).rejects.toThrow("Discord member does not exist");
    expect(await getDiscordOAuthTokens("unknown-member")).toBeNull();
  });

  it("still records opt-out for someone who has never logged in", async () => {
    await markMemberOptedOut("unregistered-member");
    const member = await getMember("unregistered-member");
    expect(member).toMatchObject({
      optedOut: true,
      onboardingCompleted: false,
    });
    expect(member?.createdAt).toBeInstanceOf(Timestamp);

    await markMemberOptedOut("unregistered-member");
    expect((await getMember("unregistered-member"))?.createdAt).toEqual(
      member?.createdAt,
    );
    expect(await getDiscordOAuthTokens("unregistered-member")).toBeNull();
  });
});
