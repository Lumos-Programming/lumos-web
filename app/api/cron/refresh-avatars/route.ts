import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import {
  getMembersWithLine,
  getMembersForDiscordAvatarRefresh,
} from "@/lib/members";
import { refreshSingleMemberLineAvatar } from "@/lib/line-invite";
import { refreshSingleMemberDiscordAvatar } from "@/lib/discord-avatar";

export const runtime = "nodejs";
// メンバー数が増えても外部 API 呼び出しを処理しきれるよう延長
export const maxDuration = 300;

/** エンドポイント全体のクールダウン（24時間）。前回実行からこの秒数空かないと発火しない。 */
const COOLDOWN_SECONDS = 24 * 60 * 60;
const COOLDOWN_DOC_PATH = "system/avatarRefresh";

/** Discord のグローバルレート制限 (~50 req/s) に余裕を持たせる呼び出し間隔 */
const REQUEST_INTERVAL_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface RefreshSummary {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
}

/** LINE 連携メンバーの lineAvatar を最新化する */
async function refreshLineAvatars(): Promise<RefreshSummary> {
  const members = await getMembersWithLine();
  const summary: RefreshSummary = {
    total: members.length,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const member of members) {
    const result = await refreshSingleMemberLineAvatar(member);
    if (result.status === "updated") summary.updated++;
    else if (result.status === "skipped") summary.skipped++;
    else {
      summary.failed++;
      console.error(
        `LINE avatar refresh failed for ${result.discordId}: ${result.error}`,
      );
    }
  }

  return summary;
}

/** 全メンバーの discordAvatar を最新化する */
async function refreshDiscordAvatars(): Promise<RefreshSummary> {
  const members = await getMembersForDiscordAvatarRefresh();
  const summary: RefreshSummary = {
    total: members.length,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const member of members) {
    const result = await refreshSingleMemberDiscordAvatar(member);
    if (result.status === "updated") summary.updated++;
    else if (result.status === "skipped") summary.skipped++;
    else {
      summary.failed++;
      console.error(
        `Discord avatar refresh failed for ${result.discordId}: ${result.error}`,
      );
    }
    // Discord API のレート制限に配慮
    await sleep(REQUEST_INTERVAL_MS);
  }

  return summary;
}

/**
 * Cloud Scheduler から定期実行される、外部連携アバター（LINE / Discord）の更新バッチ。
 * LINE は保存トークンで /v2/profile を、Discord は Bot トークンで /users/{id} を叩き、
 * 最新のアバターに追従させてリンク切れを解消する。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const cooldownRef = db.doc(COOLDOWN_DOC_PATH);
  const nowSec = Math.floor(Date.now() / 1000);

  // ── 24時間クールダウン判定（エンドポイント全体） ──
  const cooldownSnap = await cooldownRef.get();
  const lastRunAt = cooldownSnap.exists
    ? (cooldownSnap.data()?.lastRunAt as number | undefined)
    : undefined;
  if (lastRunAt !== undefined && nowSec - lastRunAt < COOLDOWN_SECONDS) {
    const retryAfter = COOLDOWN_SECONDS - (nowSec - lastRunAt);
    return NextResponse.json(
      { error: "Cooldown active", retryAfterSeconds: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // クールダウン基準を先に更新し、多重起動でも実質1回に絞る
  await cooldownRef.set({ lastRunAt: nowSec }, { merge: true });

  const line = await refreshLineAvatars();
  const discord = await refreshDiscordAvatars();

  return NextResponse.json({ line, discord });
}
