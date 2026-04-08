import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getMember,
  isOnboardingComplete,
  updateMemberSns,
} from "@/lib/members";
import {
  findPendingInvitationByLineId,
  markInvitationUsed,
  sendLineGroupJoinedDM,
} from "@/lib/line-invite";

function verifySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const hash = crypto
    .createHmac("SHA256", secret)
    .update(body)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "base64"),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

interface LineWebhookEvent {
  type: string;
  source?: {
    type: string;
    groupId?: string;
  };
  joined?: {
    members: Array<{
      type: string;
      userId: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.LINE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("LINE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("X-Line-Signature") ?? "";

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: { events?: LineWebhookEvent[] };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = parsed.events ?? [];

  // memberJoinedイベントを処理
  const memberJoinedEvents = events.filter(
    (e) => e.type === "memberJoined" && e.source?.type === "group",
  );

  for (const event of memberJoinedEvents) {
    const members = event.joined?.members ?? [];
    for (const member of members) {
      if (member.type !== "user") continue;

      try {
        const result = await findPendingInvitationByLineId(member.userId);
        if (!result) continue;

        const { code, invitation } = result;

        // 再連携フロー: pending情報がある場合、連携情報を切り替え
        if (invitation.pendingLineId) {
          await updateMemberSns(invitation.userId, {
            line: invitation.pendingLine,
            lineId: invitation.pendingLineId,
            lineAvatar: invitation.pendingLineAvatar,
            lineLinkedAt: Math.floor(Date.now() / 1000),
            lineAccessToken: invitation.pendingLineAccessToken,
            lineRefreshToken: invitation.pendingLineRefreshToken,
            lineTokenExpiresAt: invitation.pendingLineTokenExpiresAt,
          });
        }

        await markInvitationUsed(code);

        // グループ参加完了DMを送信
        try {
          const memberDoc = await getMember(invitation.userId);
          const isOnboarding = memberDoc && !isOnboardingComplete(memberDoc);
          const onboardingUrl = isOnboarding
            ? `${process.env.AUTH_URL ?? "http://localhost:3000"}/internal/onboarding`
            : undefined;

          await sendLineGroupJoinedDM(member.userId, onboardingUrl);
        } catch (dmError) {
          console.error(
            `Failed to send group joined DM to ${member.userId}:`,
            dmError,
          );
        }
      } catch (e) {
        console.error(`Error processing memberJoined for ${member.userId}:`, e);
      }
    }
  }

  // LINE Webhookは常に200を期待
  return NextResponse.json({ ok: true });
}
