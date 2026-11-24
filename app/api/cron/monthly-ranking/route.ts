import { NextResponse, type NextRequest } from "next/server";
import { finalizeMonthlyRanking, previousJstMonthKey } from "@/lib/ranking";
import {
  buildRankingNotification,
  notifyRankingChannel,
} from "@/lib/ranking-notification";

/**
 * Cloud Scheduler から毎月 1 日 9:00 JST に呼ばれる月間ランキングの確定 (#376)。
 * 日本時間の前月を確定し、表彰対象を Discord に投稿する。確定済みの月は結果を変えない。
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

  const month = previousJstMonthKey(new Date());
  let result;
  try {
    result = await finalizeMonthlyRanking(month);
  } catch (e) {
    console.error("[cron/monthly-ranking] Failed to finalize:", e);
    return NextResponse.json({ error: "Failed to finalize" }, { status: 500 });
  }

  const { ranking, created } = result;
  let notified = false;
  // 新しく確定し、表彰対象がいた月だけ通知する (再実行で二重投稿しない)
  if (created && ranking.honorees.length > 0) {
    const origin = process.env.AUTH_URL ?? request.nextUrl.origin;
    try {
      notified = await notifyRankingChannel(
        buildRankingNotification(ranking, `${origin}/internal/ranking`),
      );
    } catch (e) {
      // 確定結果は保存済みなので 200 を返す (再実行しても通知は再送されない)
      console.error("[cron/monthly-ranking] Failed to notify:", e);
    }
  }

  return NextResponse.json({
    month,
    created,
    ranked: ranking.entries.length,
    honorees: ranking.honorees.length,
    notified,
  });
}
