import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDebugProfile } from "./debug-profile";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isProduction: vi.fn(),
  updateMember: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/env", () => ({ isProduction: mocks.isProduction }));
vi.mock("@/lib/members", () => ({ updateMember: mocks.updateMember }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: "123456789012345678", optedOut: false },
  });
  mocks.isProduction.mockReturnValue(false);
  mocks.updateMember.mockResolvedValue(undefined);
});

describe("registerDebugProfile", () => {
  it("rejects anonymous users without updating a member", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(registerDebugProfile()).resolves.toEqual({
      success: false,
      error: "ログインが必要です",
    });
    expect(mocks.updateMember).not.toHaveBeenCalled();
  });

  it("rejects opted-out users without updating a member", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "123456789012345678", optedOut: true },
    });

    await expect(registerDebugProfile()).resolves.toEqual({
      success: false,
      error: "退会済みアカウントでは操作できません",
    });
    expect(mocks.updateMember).not.toHaveBeenCalled();
  });

  it("is unavailable in production", async () => {
    mocks.isProduction.mockReturnValue(true);

    await expect(registerDebugProfile()).resolves.toEqual({
      success: false,
      error: "本番環境では使用できません",
    });
    expect(mocks.updateMember).not.toHaveBeenCalled();
  });

  it("completes only the signed-in user's profile with safe deterministic data", async () => {
    await expect(registerDebugProfile()).resolves.toEqual({ success: true });

    expect(mocks.updateMember).toHaveBeenCalledExactlyOnceWith(
      "123456789012345678",
      {
        studentId: "00DE000",
        nickname: "デバッグユーザー",
        lastName: "デバッグ",
        firstName: "太郎",
        lastNameRomaji: "Debug",
        firstNameRomaji: "Taro",
        bio: "ローカル開発用のデバッグプロフィールです。",
        memberType: "卒業生",
        currentOrg: "Lumos",
        enrollments: [
          {
            faculty: "理工学部",
            admissionYear: "2020",
            enrollmentType: "入学",
            graduationYear: "2024",
            isCurrent: true,
          },
        ],
        allowPublic: false,
        onboardingCompleted: true,
      },
    );
  });

  it("returns a safe error when the profile update fails", async () => {
    mocks.updateMember.mockRejectedValue(new Error("database credential"));

    await expect(registerDebugProfile()).resolves.toEqual({
      success: false,
      error: "デバッグプロフィールの登録に失敗しました",
    });
  });
});
