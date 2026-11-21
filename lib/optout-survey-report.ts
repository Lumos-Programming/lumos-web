/**
 * 退会（継続しない）アンケートの回答を管理者向けに集計する（#233）。
 * 回答は `survey_optout/{discordId}` に保存されている（lib/discord-optout.ts）。
 * 呼び出し側（管理者ページ）で isAdmin を確認すること。
 */

import type { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";
import { OPTOUT_REASON_OPTIONS, optoutReasonLabel } from "@/types/optout";

export interface OptoutSurveyRow {
  discordId: string;
  /** 表示名。メンバーの doc が無ければ Discord ID */
  name: string;
  reason: string;
  reasonLabel: string;
  reasonDetail?: string;
  /** 回答日時（ミリ秒）。サーバー時刻が未確定なら null */
  answeredAt: number | null;
  /** Discord DM での最終確認まで終えたか（終えていなければ退会は未確定） */
  confirmed: boolean;
}

export interface OptoutReasonCount {
  reason: string;
  label: string;
  confirmed: number;
  unconfirmed: number;
}

type MemberNameFields = {
  lastName?: string;
  firstName?: string;
  nickname?: string;
  discordUsername?: string;
};

/** 管理者が誰か分かる名前を作る。氏名 → ニックネーム → Discord 名 → ID の順 */
export function displayName(
  discordId: string,
  member: MemberNameFields | undefined,
): string {
  const fullName =
    `${member?.lastName ?? ""} ${member?.firstName ?? ""}`.trim();
  return fullName || member?.nickname || member?.discordUsername || discordId;
}

function toMillis(value: unknown): number | null {
  if (value && typeof (value as Timestamp).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  return null;
}

/** 選択肢ごとの件数。選択肢の順に並べ、0 件の選択肢も含める。未知の値は末尾に足す */
export function countReasons(rows: OptoutSurveyRow[]): OptoutReasonCount[] {
  const counts = new Map<string, OptoutReasonCount>(
    OPTOUT_REASON_OPTIONS.map((o) => [
      o.value,
      { reason: o.value, label: o.label, confirmed: 0, unconfirmed: 0 },
    ]),
  );
  for (const row of rows) {
    let entry = counts.get(row.reason);
    if (!entry) {
      entry = {
        reason: row.reason,
        label: optoutReasonLabel(row.reason),
        confirmed: 0,
        unconfirmed: 0,
      };
      counts.set(row.reason, entry);
    }
    if (row.confirmed) entry.confirmed++;
    else entry.unconfirmed++;
  }
  return [...counts.values()];
}

/** 全回答を新しい順に返す */
export async function listOptoutSurveys(): Promise<OptoutSurveyRow[]> {
  const db = getDb();
  const snapshot = await db.collection("survey_optout").get();
  if (snapshot.empty) return [];

  const memberRefs = snapshot.docs.map((d) =>
    db.collection("members").doc(d.id),
  );
  const memberSnaps = await db.getAll(...memberRefs);
  const members = new Map(
    memberSnaps.map((s) => [s.id, s.data() as MemberNameFields | undefined]),
  );

  const rows = snapshot.docs.map((doc): OptoutSurveyRow => {
    const data = doc.data();
    const reason = typeof data.reason === "string" ? data.reason : "";
    return {
      discordId: doc.id,
      name: displayName(doc.id, members.get(doc.id)),
      reason,
      reasonLabel: optoutReasonLabel(reason),
      ...(typeof data.reasonDetail === "string" && data.reasonDetail
        ? { reasonDetail: data.reasonDetail }
        : {}),
      answeredAt: toMillis(data.updatedAt) ?? toMillis(data.createdAt),
      confirmed: data.confirmedAt != null,
    };
  });
  return rows.sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0));
}
