import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAppEnv: vi.fn(),
  getMember: vi.fn(),
  checkReturningMember: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/env", () => ({ getAppEnv: mocks.getAppEnv }));
vi.mock("@/lib/members", () => ({
  getMember: mocks.getMember,
  isOnboardingComplete: () => false,
}));
vi.mock("@/lib/discord", () => ({
  checkReturningMember: mocks.checkReturningMember,
}));
vi.mock("@/components/onboarding-form", () => ({
  default: () => <main>オンボーディングフォーム</main>,
}));
vi.mock("@/lib/debug-profile", () => ({
  registerDebugProfile: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "123456789012345678" } });
  mocks.getAppEnv.mockReturnValue("local");
  mocks.getMember.mockResolvedValue({ onboardingCompleted: false });
  mocks.checkReturningMember.mockResolvedValue(false);
});

describe("OnboardingPage debug profile shortcut", () => {
  it("shows the shortcut when debug profiles are enabled", async () => {
    const page = await OnboardingPage({ searchParams: Promise.resolve({}) });

    expect(renderToStaticMarkup(page)).toContain("デバッグプロフィールを登録");
  });

  it("does not render the shortcut when debug profiles are not enabled", async () => {
    mocks.getAppEnv.mockReturnValue("staging");

    const page = await OnboardingPage({ searchParams: Promise.resolve({}) });

    expect(renderToStaticMarkup(page)).not.toContain(
      "デバッグプロフィールを登録",
    );
  });
});
