import type { AttendanceCandidate } from "@/types/event";

/** 一覧に出す名前。本名 → ニックネーム → Discord 名の順で最初に埋まっているもの */
export function candidateLabel(c: AttendanceCandidate): string {
  return c.fullName || c.nickname || c.discordUsername || c.id;
}

/** 全角英数・カタカナの揺れを吸収して比較する */
function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "");
}

/**
 * 本名・ニックネーム・Discord 名のどれかに検索語が含まれるメンバーを返す。
 * カタカナとひらがな、全角と半角、大文字と小文字、空白の有無は区別しない。
 * 検索語が空なら全員。
 */
export function filterCandidates(
  candidates: AttendanceCandidate[],
  query: string,
): AttendanceCandidate[] {
  const q = normalize(query);
  if (q === "") return candidates;
  return candidates.filter((c) =>
    [c.fullName, c.nickname, c.discordUsername].some((field) =>
      normalize(field).includes(q),
    ),
  );
}

/**
 * 出席登録画面の並び。各メンバーはどれか 1 つにだけ入る。
 * - respondents: 事前アンケートの回答者 (出席済みかどうかに関わらず先頭にまとめ、当日にチェックしやすくする)
 * - attendees: アンケート未回答で出席済み (飛び込み参加など)
 * - others: それ以外
 * 回答しただけでは出席扱いにしないので、回答者もチェックを入れるまでは未出席のまま。
 * 入力の並び (名前順) は各グループ内で保つ。
 */
export function partitionCandidates(
  candidates: AttendanceCandidate[],
  attendeeIds: ReadonlySet<string>,
  respondentIds: ReadonlySet<string>,
): {
  respondents: AttendanceCandidate[];
  attendees: AttendanceCandidate[];
  others: AttendanceCandidate[];
} {
  const respondents: AttendanceCandidate[] = [];
  const attendees: AttendanceCandidate[] = [];
  const others: AttendanceCandidate[] = [];
  for (const c of candidates) {
    if (respondentIds.has(c.id)) respondents.push(c);
    else if (attendeeIds.has(c.id)) attendees.push(c);
    else others.push(c);
  }
  return { respondents, attendees, others };
}
