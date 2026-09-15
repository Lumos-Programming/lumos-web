/**
 * Lusy GitHub Reminder Bot のドメイン型。
 *
 * GitHub GraphQL のレスポンスをそのまま持ち回すと分類ロジックが API 形状に
 * 引きずられるため、必要なフィールドだけに正規化してからロジックへ渡す。
 */

export type LusyItemType = "issue" | "pull_request";

/** GitHub のユーザー参照。databaseId は改名に強い数値 ID (members.githubId と対応)。 */
export interface GitHubUserRef {
  login: string;
  databaseId: number | null;
}

/** GitHub の Team 参照。レビュー依頼が Team 宛のときに現れる。 */
export interface GitHubTeamRef {
  slug: string;
  name: string;
}

export interface LusyIssue {
  nodeId: string;
  repository: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  assignees: GitHubUserRef[];
  /** Project V2 の Status field の値。Project 外の Item では null。 */
  projectStatus: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

/** GitHub の PullRequestReviewState のうち、判定に使う値。 */
export type ReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";

export interface LusyPullRequest {
  nodeId: string;
  repository: string;
  number: number;
  title: string;
  url: string;
  author: GitHubUserRef | null;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  requestedUsers: GitHubUserRef[];
  requestedTeams: GitHubTeamRef[];
  /**
   * GitHub の reviewDecision。branch protection でレビューが必須化されていない
   * repository では常に null になるため、これ単体で分類してはいけない。
   * 実際 Lumos-Programming/lumos-web は main が非保護で全 PR が null。
   */
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  /** reviewer ごとの最新の opinionated review (APPROVED / CHANGES_REQUESTED)。 */
  latestReviews: { author: GitHubUserRef | null; state: ReviewState }[];
  projectStatus: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
}

/** PR を「次に誰が動くべきか」で分類した結果。 */
export type PrCategory =
  | "draft"
  | "review_waiting"
  | "reviewer_unassigned"
  | "changes_requested"
  | "approved"
  | "merged";

/** 個人の Action Queue / チーム Digest に載る 1 行分。 */
export interface ActionItem {
  nodeId: string;
  itemType: LusyItemType;
  repository: string;
  number: number;
  title: string;
  url: string;
  /** どのバケットに入るか。 */
  kind:
    | "issue_open"
    | "issue_unassigned"
    | "draft"
    | "review_waiting"
    | "reviewer_unassigned"
    | "changes_requested"
    | "issue_completed"
    | "pr_merged";
  /** レビュー依頼が Team 宛だったか (DM で「チーム宛」と明示するため)。 */
  viaTeam?: GitHubTeamRef;
}

/** 1 人分の Action Queue。 */
export interface PersonalQueue {
  /** 紐付いていれば Discord ID。未連携なら null。 */
  discordId: string | null;
  githubLogin: string;
  items: ActionItem[];
}
