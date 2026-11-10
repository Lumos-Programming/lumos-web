/**
 * 週次宝くじの締切計算。締切は毎週金曜 17:00 (日本時間)。
 * 回の ID はその金曜日の日本時間の日付 "YYYY-MM-DD"。
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const FRIDAY = 5;

/** 回の締切時刻 */
export function drawDeadline(drawId: string): Date {
  return new Date(`${drawId}T17:00:00+09:00`);
}

function jstDateKey(ms: number): string {
  return new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 時刻 at に作られたチケットが属する回。at より後に来る最初の締切の回。
 * 締切ちょうど (17:00:00.000) のチケットは翌週の回に入る。
 */
export function drawIdFor(at: Date): string {
  const jst = new Date(at.getTime() + JST_OFFSET_MS);
  const daysUntilFriday = (FRIDAY - jst.getUTCDay() + 7) % 7;
  const friday = jstDateKey(at.getTime() + daysUntilFriday * DAY_MS);
  if (drawDeadline(friday).getTime() > at.getTime()) return friday;
  return jstDateKey(drawDeadline(friday).getTime() + 7 * DAY_MS);
}

/** now の時点で締切を過ぎている最新の回 (cron が抽選する回) */
export function latestClosedDrawId(now: Date): string {
  const next = drawDeadline(drawIdFor(now)).getTime();
  return jstDateKey(next - 7 * DAY_MS);
}
