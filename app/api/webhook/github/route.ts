import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  discardPendingCompletion,
  recordCompletionEvent,
} from "@/lib/lusy/store";
import type { GitHubUserRef } from "@/lib/lusy/types";

export const runtime = "nodejs";

/**
 * GitHub App の Webhook 受信口。
 *
 * 完了イベント (Issue close / PR merge) の一次ソース。定期実行の snapshot 差分だけでは
 * 「前回実行から今回実行の間に作られて閉じられた」Item を検出できないため、
 * ここで拾って Firestore に貯め、3 日ごとの Digest でまとめて祝う。
 *
 * 署名検証は X-Hub-Signature-256 (HMAC-SHA256)。
 */
function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

interface GitHubActor {
  login: string;
  id: number;
}

interface IssuePayload {
  node_id: string;
  number: number;
  title: string;
  html_url: string;
  closed_at: string | null;
  state_reason?: string | null;
  assignees?: GitHubActor[] | null;
}

interface PullRequestPayload {
  node_id: string;
  number: number;
  title: string;
  html_url: string;
  merged: boolean;
  merged_at: string | null;
  user?: GitHubActor | null;
}

interface WebhookBody {
  action?: string;
  repository?: { name: string };
  issue?: IssuePayload;
  pull_request?: PullRequestPayload;
}

function toUserRefs(actors: GitHubActor[] | null | undefined): GitHubUserRef[] {
  if (!actors) return [];
  return actors.map((a) => ({ login: a.login, databaseId: a.id }));
}

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("GITHUB_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  if (
    !verifySignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      secret,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repository = body.repository?.name;
  if (!repository) return NextResponse.json({ ok: true, skipped: "no repo" });

  // --- Issue が閉じられた ---
  if (event === "issues" && body.issue) {
    const issue = body.issue;

    if (body.action === "reopened") {
      await discardPendingCompletion(issue.node_id);
      return NextResponse.json({ ok: true, discarded: issue.node_id });
    }

    // "not_planned" で閉じたものは達成ではないので祝わない
    if (body.action === "closed" && issue.state_reason !== "not_planned") {
      await recordCompletionEvent({
        nodeId: issue.node_id,
        itemType: "issue",
        repository,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        celebrants: toUserRefs(issue.assignees),
        completedAt: issue.closed_at ?? new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, recorded: issue.node_id });
    }
  }

  // --- PR がマージされた（close されただけのものは祝わない） ---
  if (
    event === "pull_request" &&
    body.action === "closed" &&
    body.pull_request?.merged
  ) {
    const pr = body.pull_request;
    await recordCompletionEvent({
      nodeId: pr.node_id,
      itemType: "pull_request",
      repository,
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      celebrants: pr.user ? toUserRefs([pr.user]) : [],
      completedAt: pr.merged_at ?? new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, recorded: pr.node_id });
  }

  return NextResponse.json({ ok: true, skipped: event ?? "unknown" });
}
