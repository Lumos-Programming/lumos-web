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
