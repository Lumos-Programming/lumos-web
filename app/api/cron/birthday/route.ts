import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { profileToMemberInternal } from "@/lib/members";
import type { MemberDocument } from "@/lib/members";
import {
  notifyAdminChannel,
  buildBirthdayNotification,
} from "@/lib/discord-dm";

// Cloud Scheduler から呼び出される誕生日通知エンドポイント。
// 認証: Authorization: Bearer {CRON_SECRET} ヘッダーで保護。
//
// Cloud Scheduler 設定例:
//   URL: https://<your-app>/api/cron/birthday
//   Schedule: 0 9 * * *  (毎朝 9:00 JST = 0:00 UTC)
//   HTTP method: GET
//   Headers: Authorization: Bearer <CRON_SECRET>

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = getDb();
  const snap = await db
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .get();

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${mm}-${dd}`;

  const todayMembers = snap.docs.flatMap((doc) => {
    const data = doc.data() as MemberDocument;
    if (data.optedOut) return [];
    const member = profileToMemberInternal(doc.id, data);
    if (!member.birthDate) return [];
    if (member.birthDate.slice(5) !== today) return [];
    return [member];
  });

  if (todayMembers.length === 0) {
    return NextResponse.json({ notified: false, count: 0 });
  }

  const names = todayMembers.map((m) => m.nickname || m.name);

  try {
    await notifyAdminChannel(buildBirthdayNotification(names));
  } catch (e) {
    console.error("[cron/birthday] Failed to notify:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  return NextResponse.json({
    notified: true,
    count: todayMembers.length,
    names,
  });
}
