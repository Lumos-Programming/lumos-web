import { NextRequest, NextResponse } from "next/server";
import { loadLusyConfig } from "@/lib/lusy/config";
import { runLusyReminder } from "@/lib/lusy/reminder";
import { getRunState, isCooldownActive } from "@/lib/lusy/store";

export const runtime = "nodejs";
// GitHub の全 Project item 取得 + メンバー数分の DM を捌けるよう延長
export const maxDuration = 300;

/**
 * Lusy GitHub Reminder Bot の定期実行エンドポイント。
 *
 * Cloud Scheduler は毎日叩き、実際に送るかどうかは NOTIFICATION_INTERVAL_DAYS の
 * クールダウンで判定する。3 日周期でスケジュールしてしまうと 1 回失敗したときに
 * 次の実行が 3 日後になるため（refresh-avatars と同じ方針）。
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

  const config = loadLusyConfig();
  if (!config) {
    console.error(
      "Lusy reminder is not configured (GITHUB_ORG / GITHUB_PROJECT_NUMBER / LUSY_DISCORD_CHANNEL_ID)",
    );
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const state = await getRunState();
  const cooldown = isCooldownActive(state, config.intervalDays);
  if (cooldown.active) {
    return NextResponse.json(
      {
        error: "Cooldown active",
        retryAfterSeconds: cooldown.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(cooldown.retryAfterSeconds) },
      },
    );
  }

  try {
    const summary = await runLusyReminder(config);
    return NextResponse.json(summary);
  } catch (error) {
    // GitHub 取得に失敗した場合は中途半端な通知を出さず、
    // lastSuccessfulRunAt も更新しないので翌日の実行で再試行される。
    console.error("Lusy reminder run failed:", error);
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
