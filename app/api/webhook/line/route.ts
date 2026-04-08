import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getMember,
  isOnboardingComplete,
  updateMemberSns,
} from "@/lib/members";
import {
  checkLineGroupMembership,
  createLineInvitation,
  findMemberByLineId,
  findPendingInvitationByLineId,
  markInvitationUsed,
  sendLineReply,
  buildGroupInviteFlexMessage,
  buildGroupJoinedFlexMessage,
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
  replyToken?: string;
  source?: {
    type: string;
    userId?: string;
    groupId?: string;
  };
  joined?: {
    members: Array<{
      type: string;
      userId: string;
    }>;
  };
}

/**
 * followイベント: ユーザーがBotを友だち追加した時
 * グループ未参加なら招待DMをreplyTokenで送信（送信数カウントなし）
 */
async function handleFollow(event: LineWebhookEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  const replyToken = event.replyToken;
  if (!lineUserId || !replyToken) return;

  const result = await findMemberByLineId(lineUserId);
  if (!result) return; // 未連携ユーザーは無視

  // 既にグループ参加済みなら何もしない
  try {
    const inGroup = await checkLineGroupMembership(lineUserId);
    if (inGroup) return;
  } catch {
    // グループチェック失敗時は招待DMを送る
  }

  // 招待コード発行 + replyTokenで招待DM送信
  const { redirectUrl } = await createLineInvitation(
    result.discordId,
    lineUserId,
  );
  const message = buildGroupInviteFlexMessage(redirectUrl);
  await sendLineReply(replyToken, [message]);
}

/**
 * messageイベント: ユーザーがBotにDMした時
 * - グループ未参加 → 招待DM（reply）
 * - オンボーディング未完了 → 案内（reply）
 * - それ以外 → デフォルト応答（reply）
 * すべてreplyTokenなので送信数にカウントされない
 */
async function handleMessage(event: LineWebhookEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  const replyToken = event.replyToken;
  if (!lineUserId || !replyToken) return;

  // グループ内メッセージは無視
  if (event.source?.type === "group") return;

  const result = await findMemberByLineId(lineUserId);
  if (!result) {
    // 未連携ユーザー
    await sendLineReply(replyToken, [
      {
        type: "flex",
        altText: "Lumosからのお知らせ",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "LumosのWebサイトからLINE連携を行ってください。",
                wrap: true,
                size: "sm",
                color: "#535353",
              },
            ],
          },
        },
      },
    ]);
    return;
  }

  const { discordId } = result;

  // グループ未参加 → 招待DM
  try {
    const inGroup = await checkLineGroupMembership(lineUserId);
    if (!inGroup) {
      const { redirectUrl } = await createLineInvitation(discordId, lineUserId);
      const message = buildGroupInviteFlexMessage(redirectUrl);
      await sendLineReply(replyToken, [message]);
      return;
    }
  } catch {
    // グループチェック失敗
  }

  // グループ参加済み + オンボーディング未完了 → 案内
  const memberDoc = await getMember(discordId);
  if (memberDoc && !isOnboardingComplete(memberDoc)) {
    const origin = process.env.AUTH_URL ?? "http://localhost:3000";
    const message = buildGroupJoinedFlexMessage(
      `${origin}/internal/onboarding`,
    );
    await sendLineReply(replyToken, [message]);
    return;
  }

  // デフォルト応答
  await sendLineReply(replyToken, [
    {
      type: "flex",
      altText: "Lumosからのお知らせ",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "お問い合わせありがとうございます。\nLumosのWebサイトをご確認ください。",
              wrap: true,
              size: "sm",
              color: "#535353",
            },
          ],
        },
      },
    },
  ]);
}

/**
 * memberJoinedイベント: ユーザーがLINEグループに参加した時
 */
async function handleMemberJoined(event: LineWebhookEvent): Promise<void> {
  if (event.source?.type !== "group") return;

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

      // グループ参加完了DMを送信（push API — memberJoinedのreplyTokenはグループ返信なのでDMに使えない）
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

  for (const event of events) {
    try {
      switch (event.type) {
        case "follow":
          await handleFollow(event);
          break;
        case "message":
          await handleMessage(event);
          break;
        case "memberJoined":
          await handleMemberJoined(event);
          break;
      }
    } catch (e) {
      console.error(`Error processing ${event.type} event:`, e);
    }
  }

  // LINE Webhookは常に200を期待
  return NextResponse.json({ ok: true });
}
