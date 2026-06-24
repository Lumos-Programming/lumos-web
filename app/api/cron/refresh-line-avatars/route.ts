import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { getMembersWithLine } from "@/lib/members";
import { refreshSingleMemberLineAvatar } from "@/lib/line-invite";

export const runtime = "nodejs";
// 連携メンバーが増えても LINE API 呼び出しを処理しきれるよう延長
export const maxDuration = 300;

/** エンドポイント全体のクールダウン（24時間）。前回実行からこの秒数空かないと発火しない。 */
const COOLDOWN_SECONDS = 24 * 60 * 60;
const COOLDOWN_DOC_PATH = "system/lineAvatarRefresh";

/** Cloud Scheduler から定期実行される、全 LINE 連携メンバーの lineAvatar 更新バッチ */
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

  const members = await getMembersWithLine();

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const member of members) {
    const result = await refreshSingleMemberLineAvatar(member);
    if (result.status === "updated") {
      updated++;
    } else if (result.status === "skipped") {
      skipped++;
    } else {
      failed++;
      console.error(
        `LINE avatar refresh failed for ${result.discordId}: ${result.error}`,
      );
    }
  }

  return NextResponse.json({
    total: members.length,
    updated,
    skipped,
    failed,
  });
}
