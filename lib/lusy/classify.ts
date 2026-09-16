/**
 * Issue / PR を「次に誰が動くべきか」で分類する純粋ロジック。
 *
 * 重要: GitHub の `reviewDecision` は branch protection でレビューが必須化されて
 * いない repository では常に null になる。Lumos-Programming/lumos-web は main が
 * 非保護のため実際に全 PR で null であり、`REVIEW_REQUIRED` を条件にすると何も
 * 分類されない。そのため reviewDecision は「あれば使う」補助情報として扱い、
 * 実際の判定は requestedReviewers と latestOpinionatedReviews から導出する。
 */

import { isDoneStatus } from "./config";
import type {
  ActionItem,
  GitHubUserRef,
  LusyIssue,
  LusyPullRequest,
  PrCategory,
} from "./types";

/** レビューの総意。opinionated review が無ければ null。 */
export type DerivedReviewState = "APPROVED" | "CHANGES_REQUESTED" | null;

/**
 * PR のレビュー状態を導出する。
 * reviewDecision が入っていればそれを優先し、無ければ個々のレビューから求める。
 * CHANGES_REQUESTED は APPROVED より優先する (1 人でも修正要求があれば author の番)。
 */
export function deriveReviewState(pr: LusyPullRequest): DerivedReviewState {
  if (pr.reviewDecision === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
  if (pr.reviewDecision === "APPROVED") return "APPROVED";

  const states = pr.latestReviews.map((r) => r.state);
  if (states.includes("CHANGES_REQUESTED")) return "CHANGES_REQUESTED";
  if (states.includes("APPROVED")) return "APPROVED";
  return null;
}

/**
 * PR を分類する。CLOSED (未マージ) は通知対象外なので null。
 *
 * 優先順位:
 *   merged > draft > changes_requested > approved > review_waiting > reviewer_unassigned
 *
 * changes_requested を review_waiting より先に見るのは、修正要求が出ている PR で
 * reviewer に「レビューして」と ping してはいけないため (次に動くのは author)。
 */
export function classifyPullRequest(pr: LusyPullRequest): PrCategory | null {
  if (pr.state === "MERGED") return "merged";
  if (pr.state === "CLOSED") return null;
  if (pr.isDraft) return "draft";

  const review = deriveReviewState(pr);
  if (review === "CHANGES_REQUESTED") return "changes_requested";
  if (review === "APPROVED") return "approved";

  const hasReviewer =
    pr.requestedUsers.length > 0 || pr.requestedTeams.length > 0;
  return hasReviewer ? "review_waiting" : "reviewer_unassigned";
}

/** Issue が未完了か (OPEN かつ Project 上でも Done でない)。 */
export function isOpenIssue(issue: LusyIssue, doneStatuses: string[]): boolean {
  if (issue.state === "CLOSED") return false;
  return !isDoneStatus(issue.projectStatus, doneStatuses);
}

function issueToActionItem(
  issue: LusyIssue,
  kind: ActionItem["kind"],
): ActionItem {
  return {
    nodeId: issue.nodeId,
    itemType: "issue",
    repository: issue.repository,
    number: issue.number,
    title: issue.title,
    url: issue.url,
    kind,
  };
}

function prToActionItem(
  pr: LusyPullRequest,
  kind: ActionItem["kind"],
  viaTeam?: ActionItem["viaTeam"],
): ActionItem {
  return {
    nodeId: pr.nodeId,
    itemType: "pull_request",
    repository: pr.repository,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    kind,
    ...(viaTeam ? { viaTeam } : {}),
  };
}

/** 「この Item について次に動くべき人」と、その人に見せる行。 */
export interface Assignment {
  /** 対象の GitHub ユーザー。担当者不在なら null (チーム Digest の未定バケット行き)。 */
  user: GitHubUserRef | null;
  item: ActionItem;
}

/**
 * 未完了 Issue を Assignment に展開する。
 * assignee が居ない Issue は落とさず、user=null の Assignment として返す。
 * 「溜まっているチケットの消化」が目的なので、無担当こそ可視化する必要がある。
 */
export function assignmentsForIssue(
  issue: LusyIssue,
  doneStatuses: string[],
): Assignment[] {
  if (!isOpenIssue(issue, doneStatuses)) return [];

  if (issue.assignees.length === 0) {
    return [{ user: null, item: issueToActionItem(issue, "issue_unassigned") }];
  }
  return issue.assignees.map((user) => ({
    user,
    item: issueToActionItem(issue, "issue_open"),
  }));
}

/**
 * PR を Assignment に展開する。
 * `expandTeam` は Team slug をメンバーの GitHubUserRef 配列へ解決する関数。
 * 展開しない設定 (fanOutTeamReviews=false) の場合は空配列を返せばよく、
 * その場合 Team 宛レビューは user=null としてチャンネルにだけ出る。
 */
export function assignmentsForPullRequest(
  pr: LusyPullRequest,
  expandTeam: (slug: string) => GitHubUserRef[],
): Assignment[] {
  const category = classifyPullRequest(pr);
  if (category === null || category === "approved") return [];

  if (category === "merged") {
    return pr.author
      ? [{ user: pr.author, item: prToActionItem(pr, "pr_merged") }]
      : [{ user: null, item: prToActionItem(pr, "pr_merged") }];
  }

  // author が次に動くカテゴリ
  if (
    category === "draft" ||
    category === "reviewer_unassigned" ||
    category === "changes_requested"
  ) {
    const kind = category as ActionItem["kind"];
    return [{ user: pr.author, item: prToActionItem(pr, kind) }];
  }

  // review_waiting: 指名された reviewer と、Team を展開したメンバーが対象
  const assignments: Assignment[] = pr.requestedUsers.map((user) => ({
    user,
    item: prToActionItem(pr, "review_waiting"),
  }));

  for (const team of pr.requestedTeams) {
    const members = expandTeam(team.slug);
    if (members.length === 0) {
      // 展開できない (権限不足 / 設定 off) 場合もチャンネルからは消さない
      assignments.push({
        user: null,
        item: prToActionItem(pr, "review_waiting", team),
      });
      continue;
    }
    for (const user of members) {
      assignments.push({
        user,
        item: prToActionItem(pr, "review_waiting", team),
      });
    }
  }

  return assignments;
}

/**
 * 同じ人・同じ Item の重複を潰す。
 * Team 宛と個人宛の両方でレビュー依頼が来ている場合、個人宛を優先して残す
 * (「チーム宛」と表示するより「あなた宛」の方が正確なため)。
 */
export function dedupeAssignments(assignments: Assignment[]): Assignment[] {
  const byKey = new Map<string, Assignment>();
  for (const a of assignments) {
    const key = `${a.user?.databaseId ?? a.user?.login ?? "__none__"}:${a.item.nodeId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, a);
      continue;
    }
    // 直接指名 (viaTeam なし) を優先
    if (existing.item.viaTeam && !a.item.viaTeam) byKey.set(key, a);
  }
  return [...byKey.values()];
}
