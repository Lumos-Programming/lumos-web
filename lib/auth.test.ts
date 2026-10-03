import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, NextAuthConfig, Profile } from "next-auth";
import type { JWT } from "next-auth/jwt";
import "./auth";

const mocks = vi.hoisted(() => {
  const callbacks: NonNullable<NextAuthConfig["callbacks"]> = {};
  return {
    callbacks,
    getOrCreateMember: vi.fn(),
    getMember: vi.fn(),
    isDiscordIdOptedOut: vi.fn(),
    sendDiscordDm: vi.fn(),
    saveDiscordOAuthTokens: vi.fn(),
  };
});

vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    Object.assign(mocks.callbacks, config.callbacks);
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("@/lib/members", () => ({
  getOrCreateMember: mocks.getOrCreateMember,
  getMember: mocks.getMember,
  isDiscordIdOptedOut: mocks.isDiscordIdOptedOut,
}));
vi.mock("@/lib/sub-account", () => ({ isSubAccountDiscordId: vi.fn() }));
vi.mock("@/lib/discord-oauth-tokens", () => ({
  saveDiscordOAuthTokens: mocks.saveDiscordOAuthTokens,
}));
vi.mock("@/lib/discord-dm", () => ({
  sendDiscordDm: mocks.sendDiscordDm,
  buildWelcomeMessage: vi.fn(),
  buildLoginMessage: vi.fn(),
  buildWelcomeBackMessage: vi.fn(),
  calcProfileCompletion: vi.fn(),
}));

const discordId = "123456789012345678";
const accessToken = "discord-oauth-secret";
const refreshToken = "discord-refresh-secret";
const discordAccount: Account = {
  provider: "discord",
  type: "oauth",
  providerAccountId: discordId,
  access_token: accessToken,
  refresh_token: refreshToken,
  expires_at: 1791028800,
  scope: "identify guilds guilds.members.read",
  token_type: "bearer",
};

function jwt(params: Parameters<NonNullable<typeof mocks.callbacks.jwt>>[0]) {
  if (!mocks.callbacks.jwt) throw new Error("JWT callback is not configured");
  return mocks.callbacks.jwt(params);
}

function session(token: JWT, trigger?: "update") {
  if (!mocks.callbacks.session)
    throw new Error("Session callback is not configured");
  // Auth.js types also require database-session fields, which JWT sessions omit.
  const params = {
    session: {
      user: { id: discordId, isAdmin: false },
      expires: "2026-10-04T00:00:00Z",
    },
    token,
    trigger,
  } as Parameters<typeof mocks.callbacks.session>[0];
  return mocks.callbacks.session(params);
}

function signIn(profile?: Profile, account: Account = discordAccount) {
  return jwt({
    token: { name: "Member" },
    user: { id: discordId },
    account,
    profile,
    trigger: "signIn",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DISCORD_GUILD_ID", "");
  mocks.getOrCreateMember.mockResolvedValue({
    isNewMember: false,
    lastLoginAt: null,
  });
  mocks.getMember.mockResolvedValue(null);
  mocks.isDiscordIdOptedOut.mockResolvedValue(false);
  mocks.sendDiscordDm.mockResolvedValue(undefined);
  mocks.saveDiscordOAuthTokens.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Discord MFA at sign-in", () => {
  it.each([true, false])(
    "passes mfa_enabled=%s to the member upsert",
    async (mfaEnabled) => {
      await signIn({ mfa_enabled: mfaEnabled });

      expect(mocks.getOrCreateMember).toHaveBeenCalledTimes(1);
      const [memberId, , , , storedMfaEnabled] =
        mocks.getOrCreateMember.mock.calls[0];
      expect(memberId).toBe(discordId);
      expect(storedMfaEnabled).toBe(mfaEnabled);
    },
  );

  it.each([
    { name: "missing profile", profile: undefined },
    { name: "missing field", profile: {} },
    { name: "null field", profile: { mfa_enabled: null } },
    { name: "non-boolean field", profile: { mfa_enabled: "false" } },
  ])("leaves MFA unknown for a $name", async ({ profile }) => {
    await signIn(profile);

    expect(mocks.getOrCreateMember).toHaveBeenCalledTimes(1);
    expect(mocks.getOrCreateMember.mock.calls[0][4]).toBeUndefined();
  });
});

describe("Discord OAuth token storage", () => {
  it("saves the full token snapshot privately without exposing credentials in member data, JWT, or session", async () => {
    const token = await signIn({ mfa_enabled: true });
    if (!token) throw new Error("Expected a successful login token");
    const clientSession = await session(token);

    expect(mocks.saveDiscordOAuthTokens).toHaveBeenCalledExactlyOnceWith(
      discordId,
      {
        accessToken,
        refreshToken,
        expiresAt: discordAccount.expires_at,
        scope: discordAccount.scope,
        tokenType: discordAccount.token_type,
      },
    );

    for (const secret of [accessToken, refreshToken]) {
      expect(JSON.stringify(mocks.getOrCreateMember.mock.calls)).not.toContain(
        secret,
      );
      expect(JSON.stringify(token)).not.toContain(secret);
      expect(JSON.stringify(clientSession)).not.toContain(secret);
    }
  });

  it("saves a new snapshot on each accepted login, including omitted optional fields", async () => {
    await signIn();
    await signIn(undefined, {
      provider: "discord",
      type: "oauth",
      providerAccountId: discordId,
      access_token: "replacement-access-token",
    });

    expect(mocks.saveDiscordOAuthTokens).toHaveBeenCalledTimes(2);
    expect(mocks.saveDiscordOAuthTokens).toHaveBeenLastCalledWith(discordId, {
      accessToken: "replacement-access-token",
      refreshToken: undefined,
      expiresAt: undefined,
      scope: undefined,
      tokenType: undefined,
    });
  });

  it("does not save a tokenless Discord callback", async () => {
    await signIn(undefined, { ...discordAccount, access_token: undefined });

    expect(mocks.saveDiscordOAuthTokens).not.toHaveBeenCalled();
  });

  it("does not save credentials from a non-Discord account", async () => {
    await signIn(undefined, { ...discordAccount, provider: "github" });

    expect(mocks.saveDiscordOAuthTokens).not.toHaveBeenCalled();
  });

  it("fails login when private token storage fails", async () => {
    const error = new Error("Token storage unavailable");
    mocks.saveDiscordOAuthTokens.mockRejectedValue(error);

    await expect(signIn()).rejects.toBe(error);
    expect(mocks.sendDiscordDm).not.toHaveBeenCalled();
  });
});

it.each([undefined, "update"] as const)(
  "does not upsert MFA during a JWT refresh with trigger=%s",
  async (trigger) => {
    const token = await jwt({ token: { sub: discordId }, user: {}, trigger });

    expect(mocks.getOrCreateMember).not.toHaveBeenCalled();
    expect(mocks.saveDiscordOAuthTokens).not.toHaveBeenCalled();
    expect(token).not.toHaveProperty("mfa_enabled");
    expect(token).not.toHaveProperty("discordMfaEnabled");
  },
);

it.each([undefined, "update"] as const)(
  "does not save OAuth tokens while constructing a session with trigger=%s",
  async (trigger) => {
    await session({ sub: discordId }, trigger);

    expect(mocks.saveDiscordOAuthTokens).not.toHaveBeenCalled();
  },
);
