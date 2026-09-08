import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as github } from "./github/callback/route";
import { GET as x } from "./x/callback/route";
import { GET as line } from "./line/callback/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cookies: new Map<string, string>(),
  exchangeCodeForToken: vi.fn(),
  exchangeCodeForTokenFull: vi.fn(),
  fetchProviderUser: vi.fn(),
  getMember: vi.fn(),
  updateMemberSns: vi.fn(),
  checkLineGroupMembership: vi.fn(),
  checkLineBotFriendship: vi.fn(),
  createLineInvitation: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => {
      const value = mocks.cookies.get(key);
      return value === undefined ? undefined : { value };
    },
    delete: (key: string) => mocks.cookies.delete(key),
  }),
}));
vi.mock("@/lib/oauth-link", () => ({
  exchangeCodeForToken: mocks.exchangeCodeForToken,
  exchangeCodeForTokenFull: mocks.exchangeCodeForTokenFull,
  fetchProviderUser: mocks.fetchProviderUser,
  getCallbackUrl: (provider: string, origin: string) =>
    `${origin}/api/auth/link/${provider}/callback`,
}));
vi.mock("@/lib/members", () => ({
  getMember: mocks.getMember,
  updateMemberSns: mocks.updateMemberSns,
}));
vi.mock("@/lib/line-invite", () => ({
  checkLineGroupMembership: mocks.checkLineGroupMembership,
  checkLineBotFriendship: mocks.checkLineBotFriendship,
  createLineInvitation: mocks.createLineInvitation,
  buildLineSnsData: () => ({ lineId: "provider-id" }),
  buildLinePendingData: () => ({ pendingLineId: "provider-id" }),
}));

function request(provider: string, query = "code=code&state=state") {
  return new NextRequest(
    `https://example.test/api/auth/link/${provider}/callback?${query}`,
  );
}

function expectNoSideEffects() {
  expect(mocks.exchangeCodeForToken).not.toHaveBeenCalled();
  expect(mocks.exchangeCodeForTokenFull).not.toHaveBeenCalled();
  expect(mocks.getMember).not.toHaveBeenCalled();
  expect(mocks.updateMemberSns).not.toHaveBeenCalled();
  expect(mocks.createLineInvitation).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.cookies.clear();
  for (const provider of ["github", "x", "line"]) {
    mocks.cookies.set(`oauth_link_state_${provider}`, "state");
  }
  mocks.cookies.set("oauth_link_verifier_x", "verifier");
  mocks.cookies.set("oauth_link_discord_id", "victim-id");
  mocks.cookies.set("oauth_link_redirect", "/internal/settings");
  mocks.auth.mockResolvedValue({ user: { id: "session-member" } });
  mocks.exchangeCodeForToken.mockResolvedValue("token");
  mocks.exchangeCodeForTokenFull.mockResolvedValue({ access_token: "token" });
  mocks.fetchProviderUser.mockResolvedValue({
    id: "provider-id",
    username: "provider-name",
    avatar: "https://example.test/avatar.png",
  });
  mocks.getMember.mockResolvedValue({ memberType: "卒業生" });
  mocks.checkLineGroupMembership.mockResolvedValue(false);
  mocks.checkLineBotFriendship.mockResolvedValue(true);
});

describe.each([
  { provider: "github", handler: github },
  { provider: "x", handler: x },
  { provider: "line", handler: line },
])("$provider OAuth callback authorization", ({ provider, handler }) => {
  it.each([
    { name: "missing session", session: null },
    { name: "missing member ID", session: { user: {} } },
    {
      name: "opted-out member",
      session: { user: { id: "session-member", optedOut: true } },
    },
  ])("rejects $name even with a target cookie", async ({ session }) => {
    mocks.auth.mockResolvedValue(session);
    const response = await handler(request(provider));
    expect(
      new URL(response.headers.get("location")!).searchParams.get("error"),
    ).toBe(`${provider}_link_failed`);
    expectNoSideEffects();
  });

  it("ignores a forged target cookie and updates only the session member", async () => {
    const response = await handler(request(provider));
    expect(mocks.updateMemberSns).toHaveBeenCalledExactlyOnceWith(
      "session-member",
      expect.objectContaining({ [`${provider}Id`]: "provider-id" }),
    );
    expect(
      new URL(response.headers.get("location")!).searchParams.has("success"),
    ).toBe(true);
    expect(mocks.cookies.has(`oauth_link_state_${provider}`)).toBe(false);
  });

  it("allows normal linking without the obsolete target cookie", async () => {
    mocks.cookies.delete("oauth_link_discord_id");
    await handler(request(provider));
    expect(mocks.updateMemberSns).toHaveBeenCalledWith(
      "session-member",
      expect.any(Object),
    );
  });

  it.each(["code=code&state=wrong", "code=code", "state=state"])(
    "rejects invalid OAuth parameters: %s",
    async (query) => {
      await handler(request(provider, query));
      expectNoSideEffects();
    },
  );
});

it("rejects X callbacks without the PKCE verifier", async () => {
  mocks.cookies.delete("oauth_link_verifier_x");
  await x(request("x"));
  expectNoSideEffects();
});

it.each(["/internal/settings", "/internal/onboarding"])(
  "uses the session member for LINE invitations from %s",
  async (redirectTo) => {
    mocks.getMember.mockResolvedValue({ memberType: "学部生" });
    mocks.cookies.set("oauth_link_redirect", redirectTo);
    await line(request("line"));
    expect(mocks.getMember).toHaveBeenCalledWith("session-member");
    expect(mocks.createLineInvitation).toHaveBeenCalledTimes(1);
    expect(mocks.createLineInvitation.mock.calls[0].slice(0, 2)).toEqual([
      "session-member",
      "provider-id",
    ]);
    if (redirectTo === "/internal/settings") {
      expect(mocks.updateMemberSns).not.toHaveBeenCalled();
    } else {
      expect(mocks.updateMemberSns).toHaveBeenCalledWith(
        "session-member",
        expect.any(Object),
      );
    }
  },
);
