/**
 * Lusy Reminder Bot の設定値。すべて環境変数から読む。
 * 対象 repository や Project は今後増える前提なのでハードコードしない。
 */

export interface LusyConfig {
  org: string;
  projectNumber: number;
  /** 空配列なら Project 上の全 repository を対象にする。 */
  targetRepos: string[];
  channelId: string;
  intervalDays: number;
  timeZone: string;
  projectStatusField: string;
  doneStatuses: string[];
  /** Team 宛レビュー依頼をメンバー全員への DM に展開するか。 */
  fanOutTeamReviews: boolean;
}

const DEFAULT_INTERVAL_DAYS = 3;
const DEFAULT_TIME_ZONE = "Asia/Tokyo";
const DEFAULT_STATUS_FIELD = "Status";
const DEFAULT_DONE_STATUSES = ["Done", "Closed", "完了"];

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * 環境変数から設定を組み立てる。必須値が欠けている場合は null を返し、
 * 呼び出し側 (cron / webhook) が 500 を返して no-op できるようにする。
 */
export function loadLusyConfig(): LusyConfig | null {
  const org = process.env.GITHUB_ORG?.trim();
  const projectNumber = Number(process.env.GITHUB_PROJECT_NUMBER);
  const channelId = process.env.LUSY_DISCORD_CHANNEL_ID?.trim();

  if (!org || !Number.isInteger(projectNumber) || !channelId) return null;

  const doneStatuses = splitList(process.env.PROJECT_DONE_STATUSES);

  return {
    org,
    projectNumber,
    targetRepos: splitList(process.env.GITHUB_TARGET_REPOS),
    channelId,
    intervalDays: parsePositiveInt(
      process.env.NOTIFICATION_INTERVAL_DAYS,
      DEFAULT_INTERVAL_DAYS,
    ),
    timeZone: process.env.LUSY_TIMEZONE?.trim() || DEFAULT_TIME_ZONE,
    projectStatusField:
      process.env.PROJECT_STATUS_FIELD?.trim() || DEFAULT_STATUS_FIELD,
    doneStatuses:
      doneStatuses.length > 0 ? doneStatuses : [...DEFAULT_DONE_STATUSES],
    fanOutTeamReviews: process.env.LUSY_FANOUT_TEAM_REVIEWS !== "false",
  };
}

/** Project Status が Done 扱いかどうか (大文字小文字は無視)。 */
export function isDoneStatus(
  status: string | null,
  doneStatuses: string[],
): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return doneStatuses.some((s) => s.trim().toLowerCase() === normalized);
}

/** repository が対象かどうか。targetRepos が空なら全許可。 */
export function isTargetRepo(repo: string, targetRepos: string[]): boolean {
  if (targetRepos.length === 0) return true;
  const normalized = repo.trim().toLowerCase();
  return targetRepos.some((r) => r.trim().toLowerCase() === normalized);
}
