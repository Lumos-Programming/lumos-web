/**
 * YYYY-MM-DD 形式の日付を「X月Y日」に変換する
 */
export function formatBirthDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  if (!m || !d) return dateStr;
  return `${parseInt(m)}月${parseInt(d)}日`;
}
