import { NextResponse } from "next/server";
import { getMemberIdByGithubId } from "@/lib/members";
import { awardPoints } from "@/lib/points";
import {
  rewardRepos,
  rewardsForGithubEvent,
  verifyGithubSignature,
} from "@/lib/github-rewards";

/**
 * GitHub リポジトリの Webhook (pull_request / pull_request_review) を受けてポイントを付与する。
 * 署名は GITHUB_WEBHOOK_SECRET で検証する。連携メンバーがいない GitHub ユーザーは無視する。
 * 付与キーで冪等なので、GitHub の再送 (Redeliver) でも二重付与にならない。
 */
export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (
    !verifyGithubSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      secret,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rewards = rewardsForGithubEvent(
    request.headers.get("x-github-event"),
    payload,
    rewardRepos(process.env.GITHUB_REWARD_REPOS),
  );

  try {
    const results = await Promise.all(
      rewards.map(async (reward) => {
        const memberId = await getMemberIdByGithubId(reward.githubUserId);
        if (!memberId) return { key: reward.key, status: "no_member" };
        const { awarded } = await awardPoints({
          key: reward.key,
          memberId,
          reason: reward.reason,
          description: reward.description,
          sourceUrl: reward.sourceUrl,
        });
        return { key: reward.key, status: awarded ? "awarded" : "duplicate" };
      }),
    );
    // GitHub の Recent Deliveries で結果を確認できるよう本文に残す
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("Failed to award GitHub points:", error);
    // 5xx を返すと GitHub 側で失敗として残り、手動で再送できる
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
