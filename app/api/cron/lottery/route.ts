import { NextResponse, type NextRequest } from "next/server";
import { runDraw } from "@/lib/lottery";
import { latestClosedDrawId } from "@/lib/lottery-schedule";
import {
  buildLotteryNotification,
  notifyLotteryChannel,
} from "@/lib/lottery-notification";

/**
 * Cloud Scheduler から毎週金曜 17:30 JST に呼ばれる週次宝くじの抽選 (#377)。
 * 締切 (金曜 17:00) を過ぎた最新の回を抽選する。抽選済みの回は結果を変えない。
 * 認可は他の /api/cron/* と同じく CRON_SECRET の Bearer ヘッダ。
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
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drawId = latestClosedDrawId(new Date());
  let result;
  try {
    result = await runDraw(drawId);
  } catch (e) {
    console.error("[cron/lottery] Failed to draw:", e);
    return NextResponse.json({ error: "Failed to draw" }, { status: 500 });
  }

  const { draw, created } = result;
  let notified = false;
  // 新しく抽選し、参加者がいた回だけ通知する (再実行で二重投稿しない)
  if (created && draw.participants > 0) {
    const origin = process.env.AUTH_URL ?? request.nextUrl.origin;
    try {
      notified = await notifyLotteryChannel(
        buildLotteryNotification(draw, `${origin}/internal/lottery`),
      );
    } catch (e) {
      // 抽選結果は保存済みなので 200 を返す (再実行しても通知は再送されない)
      console.error("[cron/lottery] Failed to notify:", e);
    }
  }

  return NextResponse.json({
    drawId,
    created,
    participants: draw.participants,
    winners: draw.winners.length,
    notified,
  });
}
