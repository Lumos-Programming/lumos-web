import crypto from "crypto";
import { getDb } from "@/lib/firebase";
import { Timestamp } from "firebase-admin/firestore";
import type { LineFlexMessage, LineFlexBubble } from "@/lib/mini-lt/line-flex";

export interface LineInvitation {
  userId: string; // Discord ID
  lineId: string; // 対象LINE user ID（初回: 本人, 再連携: 新アカウント）
  createdAt: Timestamp;
  expiresAt: Timestamp;
  used: boolean;
  // 再連携フロー用の仮保存フィールド（初回連携時はundefined）
  pendingLine?: string;
  pendingLineId?: string;
  pendingLineAvatar?: string;
  pendingLineAccessToken?: string;
  pendingLineRefreshToken?: string;
  pendingLineTokenExpiresAt?: number;
}

interface PendingData {
  pendingLine: string;
  pendingLineId: string;
  pendingLineAvatar?: string;
  pendingLineAccessToken: string;
  pendingLineRefreshToken?: string;
  pendingLineTokenExpiresAt?: number;
}

const INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function checkLineGroupMembership(
  lineUserId: string,
): Promise<boolean> {
  const groupId = process.env.LINE_GROUP_ID;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!groupId || !token) {
    throw new Error(
      "LINE_GROUP_ID or LINE_CHANNEL_ACCESS_TOKEN is not configured",
    );
  }

  const res = await fetch(
    `https://api.line.me/v2/bot/group/${groupId}/member/${lineUserId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.status === 200) return true;
  if (res.status === 404) return false;
  const body = await res.text();
  throw new Error(
    `LINE group membership check failed: ${res.status} ${res.statusText} - ${body}`,
  );
}

export async function createLineInvitation(
  userId: string,
  lineId: string,
  pendingData?: PendingData,
): Promise<{ code: string; redirectUrl: string }> {
  const db = getDb();
  const code = crypto.randomUUID();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + INVITATION_TTL_SECONDS * 1000,
  );

  const doc: LineInvitation = {
    userId,
    lineId,
    createdAt: now,
    expiresAt,
    used: false,
    ...pendingData,
  };

  await db.collection("line_invitations").doc(code).set(doc);

  const origin = process.env.AUTH_URL ?? "http://localhost:3000";
  const redirectUrl = `${origin}/api/line-invite/${code}`;

  return { code, redirectUrl };
}

export async function getLineInvitation(
  code: string,
): Promise<LineInvitation | null> {
  const db = getDb();
  const snap = await db.collection("line_invitations").doc(code).get();
  if (!snap.exists) return null;
  return snap.data() as LineInvitation;
}

export async function markInvitationUsed(code: string): Promise<void> {
  const db = getDb();
  await db.collection("line_invitations").doc(code).update({ used: true });
}

export async function findPendingInvitationByLineId(
  lineId: string,
): Promise<{ code: string; invitation: LineInvitation } | null> {
  const db = getDb();
  const snap = await db
    .collection("line_invitations")
    .where("lineId", "==", lineId)
    .where("used", "==", false)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { code: doc.id, invitation: doc.data() as LineInvitation };
}

export async function sendLineGroupInviteDM(
  lineUserId: string,
  redirectUrl: string,
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }

  const message = buildGroupInviteFlexMessage(redirectUrl);

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [message],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `LINE DM送信に失敗しました: ${res.status} ${res.statusText} - ${body}`,
    );
  }
}

export function buildGroupInviteFlexMessage(
  redirectUrl: string,
): LineFlexMessage {
  const supportUrl = process.env.LINE_INVITE_SUPPORT_URL;

  const footerContents: Record<string, unknown>[] = [
    {
      type: "text",
      text: "年齢確認が未完了の場合、グループに参加できないことがあります。",
      size: "xxs",
      color: "#999999",
      wrap: true,
    },
  ];

  if (supportUrl) {
    footerContents.push({
      type: "box",
      layout: "vertical",
      justifyContent: "center",
      cornerRadius: "md",
      margin: "sm",
      borderColor: "#999999",
      borderWidth: "1px",
      contents: [
        {
          type: "button",
          style: "link",
          color: "#999999",
          height: "sm",
          action: {
            type: "uri",
            label: "サポート担当者に連絡",
            uri: supportUrl,
          },
        },
      ],
    });
  }

  const bubble: LineFlexBubble = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "Lumosグループへの招待",
          weight: "bold",
          size: "xl",
          color: "#ffffff",
          align: "center",
          wrap: true,
        },
      ],
      background: {
        type: "linearGradient",
        angle: "135deg",
        startColor: "#6778df",
        endColor: "#7354ae",
      },
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "Lumosへようこそ！\nグループに参加して、メンバーと交流しましょう。",
          size: "sm",
          color: "#1f2937",
          wrap: true,
        },
        {
          type: "text",
          text: "下のボタンからLINEグループに参加できます。",
          size: "sm",
          color: "#535353",
          wrap: true,
        },
        {
          type: "box",
          layout: "vertical",
          justifyContent: "center",
          cornerRadius: "md",
          margin: "lg",
          background: {
            type: "linearGradient",
            angle: "135deg",
            startColor: "#06C755",
            endColor: "#05a848",
          },
          contents: [
            {
              type: "button",
              style: "link",
              color: "#ffffff",
              action: {
                type: "uri",
                label: "グループに参加する",
                uri: redirectUrl,
              },
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingTop: "0px",
      paddingBottom: "16px",
      paddingStart: "20px",
      paddingEnd: "20px",
      spacing: "sm",
      contents: footerContents,
    },
  };

  return {
    type: "flex",
    altText: "Lumosグループへの招待",
    contents: bubble,
  };
}
