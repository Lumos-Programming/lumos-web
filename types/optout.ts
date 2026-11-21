/**
 * 退会（継続しない）アンケートの選択肢。
 * 退会フォーム（components/optout/confirm-form.tsx）と管理者の集計画面（#233）で同じ表示にする。
 */
export const OPTOUT_REASON_OPTIONS = [
  { value: "busy", label: "忙しくなった・時間が取れない" },
  { value: "interest_changed", label: "興味・目標が変わった" },
  { value: "atmosphere", label: "活動の雰囲気が合わなかった" },
  { value: "content", label: "活動内容が合わなかった" },
  { value: "graduated", label: "卒業・進路変更のため" },
  { value: "other", label: "その他" },
] as const;

export type OptoutReason = (typeof OPTOUT_REASON_OPTIONS)[number]["value"];

export const OPTOUT_REASON_VALUES: readonly OptoutReason[] =
  OPTOUT_REASON_OPTIONS.map((o) => o.value);

/** 保存値から表示名を引く。未知の値はそのまま返す（選択肢を消した後の古い回答） */
export function optoutReasonLabel(reason: string): string {
  return OPTOUT_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason;
}
