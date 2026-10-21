import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getMember: vi.fn(),
  isProduction: vi.fn(),
  checkReturningMember: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/env", () => ({ isProduction: mocks.isProduction }));
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
  mocks.getMember.mockResolvedValue({ onboardingCompleted: false });
  mocks.checkReturningMember.mockResolvedValue(false);
  mocks.isProduction.mockReturnValue(false);
});

describe("OnboardingPage debug profile shortcut", () => {
  it("shows the shortcut outside production", async () => {
    const page = await OnboardingPage({ searchParams: Promise.resolve({}) });

    expect(renderToStaticMarkup(page)).toContain("デバッグプロフィールを登録");
  });

  it("does not render the shortcut in production", async () => {
    mocks.isProduction.mockReturnValue(true);

    const page = await OnboardingPage({ searchParams: Promise.resolve({}) });

    expect(renderToStaticMarkup(page)).not.toContain(
      "デバッグプロフィールを登録",
    );
  });
});
