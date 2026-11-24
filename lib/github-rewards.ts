import { createHmac, timingSafeEqual } from "crypto";
import { pointKeys } from "@/lib/points";
import type { PointReason } from "@/types/points";

/** ポイント対象のリポジトリ (owner/name)。まずは lumos-web のみ (#375) */
export const DEFAULT_REWARD_REPOS = ["Lumos-Programming/lumos-web"];

/** 環境変数 GITHUB_REWARD_REPOS (カンマ区切り) があればそちらを使う */
export function rewardRepos(env: string | undefined): string[] {
  const list = (env ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_REWARD_REPOS;
}

/**
 * X-Hub-Signature-256 ("sha256=<hex>") を検証する。
 * https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */
export function verifyGithubSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(header.slice("sha256=".length), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Webhook 1 件から導かれる付与 1 件。メンバーへの対応付けは呼び出し側で行う */
export interface GithubReward {
  githubUserId: number;
  key: string;
  reason: PointReason;
  description: string;
  sourceUrl: string;
}

interface GithubUser {
  id: number;
  type?: string;
}

interface PullRequestPayload {
  action?: string;
  repository?: { id: number; full_name: string };
  pull_request?: {
    number: number;
    title: string;
    html_url: string;
    merged?: boolean;
    user: GithubUser;
  };
  review?: { state?: string; user: GithubUser; html_url?: string };
}

const isHuman = (user: GithubUser | undefined): user is GithubUser =>
  Boolean(user) && typeof user!.id === "number" && user!.type !== "Bot";

/**
 * GitHub の Webhook イベントからポイント付与を決める。
 * - pull_request / closed かつ merged → PR 作者に github_pr_merged
 * - pull_request_review / submitted かつ approved → レビュアーに github_review_approved
 *   (自分の PR へのレビューは対象外。1 つの PR で同じ人が何度 Approve しても 1 回)
 * Bot・対象外リポジトリ・その他のイベントは空配列。
 */
export function rewardsForGithubEvent(
  eventName: string | null,
  payload: unknown,
  repos: string[],
): GithubReward[] {
  const p = payload as PullRequestPayload | null;
  const repo = p?.repository;
  const pr = p?.pull_request;
  if (!repo || !pr) return [];
  const allowed = repos.some(
    (r) => r.toLowerCase() === repo.full_name.toLowerCase(),
  );
  if (!allowed) return [];

  const description = `${repo.full_name}#${pr.number} ${pr.title}`;

  if (
    eventName === "pull_request" &&
    p.action === "closed" &&
    pr.merged === true &&
    isHuman(pr.user)
  ) {
    return [
      {
        githubUserId: pr.user.id,
        key: pointKeys.githubPrMerged(repo.id, pr.number),
        reason: "github_pr_merged",
        description,
        sourceUrl: pr.html_url,
      },
    ];
  }

  if (
    eventName === "pull_request_review" &&
    p.action === "submitted" &&
    p.review?.state?.toLowerCase() === "approved" &&
    isHuman(p.review.user) &&
    p.review.user.id !== pr.user?.id
  ) {
    return [
      {
        githubUserId: p.review.user.id,
        key: pointKeys.githubReviewApproved(
          repo.id,
          pr.number,
          p.review.user.id,
        ),
        reason: "github_review_approved",
        description,
        sourceUrl: p.review.html_url ?? pr.html_url,
      },
    ];
  }

  return [];
}
