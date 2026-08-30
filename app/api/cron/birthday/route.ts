import { NextResponse, type NextRequest } from "next/server";
import { getMembersInternal } from "@/lib/members";
import { getJstToday, isBirthdayToday } from "@/lib/date";
import {
  notifyAdminChannel,
  buildBirthdayNotification,
} from "@/lib/discord-dm";

/**
 * Cloud Scheduler から毎朝 09:00 JST に呼ばれる誕生日通知エンドポイント。
 * その日が誕生日のメンバーがいれば運営チャンネルへ webhook 通知を送る。
 *
 * 認可は他の /api/cron/* と同じく CRON_SECRET の Bearer ヘッダ。
 * スケジュール定義は infra/scheduler.tf を参照。
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

  const today = getJstToday();
  const members = await getMembersInternal();
  const names = members
    .filter((m) => m.birthDate && isBirthdayToday(m.birthDate, today))
    .map((m) => m.nickname || m.name);

  if (names.length === 0) {
    return NextResponse.json({ notified: false, count: 0 });
  }

  try {
    await notifyAdminChannel(buildBirthdayNotification(names));
  } catch (e) {
    console.error("[cron/birthday] Failed to notify:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({ notified: true, count: names.length, names });
}
