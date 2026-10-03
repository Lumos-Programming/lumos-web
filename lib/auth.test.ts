import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig, Profile } from "next-auth";
import "./auth";

const mocks = vi.hoisted(() => {
  const callbacks: NonNullable<NextAuthConfig["callbacks"]> = {};
  return {
    callbacks,
    getOrCreateMember: vi.fn(),
    getMember: vi.fn(),
    isDiscordIdOptedOut: vi.fn(),
    sendDiscordDm: vi.fn(),
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
vi.mock("@/lib/discord-dm", () => ({
  sendDiscordDm: mocks.sendDiscordDm,
  buildWelcomeMessage: vi.fn(),
  buildLoginMessage: vi.fn(),
  buildWelcomeBackMessage: vi.fn(),
  calcProfileCompletion: vi.fn(),
}));

const discordId = "123456789012345678";
const accessToken = "discord-oauth-secret";

function jwt(params: Parameters<NonNullable<typeof mocks.callbacks.jwt>>[0]) {
  if (!mocks.callbacks.jwt) throw new Error("JWT callback is not configured");
  return mocks.callbacks.jwt(params);
}

function signIn(profile?: Profile) {
  return jwt({
    token: { name: "Member" },
    user: { id: discordId },
    account: {
      provider: "discord",
      type: "oauth",
      providerAccountId: discordId,
      access_token: accessToken,
    },
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

  it("does not persist the OAuth access token in the member or JWT", async () => {
    const token = await signIn({ mfa_enabled: true });

    expect(JSON.stringify(mocks.getOrCreateMember.mock.calls)).not.toContain(
      accessToken,
    );
    expect(JSON.stringify(token)).not.toContain(accessToken);
  });
});

it.each([undefined, "update"] as const)(
  "does not upsert MFA during a JWT refresh with trigger=%s",
  async (trigger) => {
    const token = await jwt({ token: { sub: discordId }, user: {}, trigger });

    expect(mocks.getOrCreateMember).not.toHaveBeenCalled();
    expect(token).not.toHaveProperty("mfa_enabled");
    expect(token).not.toHaveProperty("discordMfaEnabled");
  },
);
