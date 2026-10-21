"use server";

import { auth } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { updateMember } from "@/lib/members";

type DebugProfileResult = { success: true } | { success: false; error: string };

const DEBUG_PROFILE = {
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
} satisfies Parameters<typeof updateMember>[1];

export async function registerDebugProfile(): Promise<DebugProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "ログインが必要です" };
  }
  if (session.user.optedOut) {
    return {
      success: false,
      error: "退会済みアカウントでは操作できません",
    };
  }
  if (isProduction()) {
    return { success: false, error: "本番環境では使用できません" };
  }

  try {
    await updateMember(session.user.id, DEBUG_PROFILE);
    return { success: true };
  } catch {
    return {
      success: false,
      error: "デバッグプロフィールの登録に失敗しました",
    };
  }
}
