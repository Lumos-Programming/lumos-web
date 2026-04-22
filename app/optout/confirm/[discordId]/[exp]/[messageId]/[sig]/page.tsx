import crypto from "crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyOptoutConfirm,
  recordOptoutSubmission,
  markOptoutSurveyConfirmed,
} from "@/lib/discord-optout";
import {
  markMemberOptedOut,
  getMember,
  isDiscordIdOptedOut,
} from "@/lib/members";
import { isValidSnowflake } from "@/lib/auth";
import {
  sendDiscordDm,
  editDiscordDm,
  buildOptoutLinkReissueMessage,
  buildOptoutCompletedMessage,
  notifyAdminChannel,
  buildAdminOptoutNotification,
} from "@/lib/discord-dm";
import { fetchDiscordDisplayName } from "@/lib/discord";
import OptoutStatusCard from "@/components/optout/status-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function hashIp(
  ip: string | null,
  secret: string | undefined,
): string | undefined {
  if (!ip || !secret) return undefined;
  return crypto
    .createHmac("sha256", secret)
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

async function reissueAndRender(discordId: string) {
  const member = await getMember(discordId);
  const displayName =
    member?.discordUsername ??
    member?.nickname ??
    (await fetchDiscordDisplayName(discordId)) ??
    "Discord ユーザー";
  try {
    await sendDiscordDm(
      discordId,
      buildOptoutLinkReissueMessage(displayName, discordId),
    );
    return (
      <OptoutStatusCard
        tone="info"
        title="新しい退会リンクを Discord に送信しました"
        description="この最終確認リンクは無効または期限切れです。最初の手続きからやり直しいただくため、新しい退会リンクを Discord のDMに改めて送信しました。そちらからもう一度お試しください。"
      />
    );
  } catch (e) {
    console.error("Failed to re-issue opt-out link:", e);
    return (
      <OptoutStatusCard
        tone="error"
        title="リンクを認識できませんでした"
        description="リンクが正しくないようです。Discord のDM設定をご確認のうえ、運営メンバーにご連絡ください。"
      />
    );
  }
}

export default async function OptoutConfirmPage({
  params,
}: {
  params: Promise<{
    discordId: string;
    exp: string;
    messageId: string;
    sig: string;
  }>;
}) {
  const { discordId, exp, messageId, sig } = await params;

  if (!isValidSnowflake(discordId)) {
    return (
      <OptoutStatusCard
        tone="error"
        title="リンクを認識できませんでした"
        description="リンクが正しくないか、破損している可能性があります。Discord DMに届いた元のメッセージからもう一度お試しください。"
      />
    );
  }

  // members.optedOut を source of truth として先に判定。
  // sig 検証より前に終状態へ飛ばすことで、AUTH_SECRET ローテ等で古いリンクが invalid に
  // なっていても退会済みユーザーに不要な再発行 DM を送らずに済む。
  if (await isDiscordIdOptedOut(discordId)) {
    redirect("/optout/done");
  }

  const result = verifyOptoutConfirm(discordId, exp, sig, messageId);
  if (!result.ok) {
    // invalid も expired も同じ: Step 1 からやり直しリンクを再送
    return reissueAndRender(discordId);
  }

  // GET で副作用を行う（署名自体が本人認証要素、Firestore 書き込みは冪等）
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;
  const userAgent = hdrs.get("user-agent") ?? undefined;

  try {
    await recordOptoutSubmission(discordId, {
      userAgent,
      ipHash: hashIp(ip, process.env.AUTH_SECRET),
    });
    await markOptoutSurveyConfirmed(discordId);
    await markMemberOptedOut(discordId);
  } catch (e) {
    console.error("Failed to record opt-out submission:", e);
    return (
      <OptoutStatusCard
        tone="error"
        title="処理に失敗しました"
        description="サーバーで保存に失敗しました。しばらくしてからもう一度お試しください。"
      />
    );
  }

  // 元の最終確認 DM のボタンを無効化 (再加入後に誤って再押下されるのを防ぐ)
  try {
    await editDiscordDm(discordId, messageId, { components: [] });
  } catch (e) {
    console.error("Failed to strip buttons from confirm DM:", e);
  }

  // 完了通知 DM (失敗してもユーザー体験には影響しないので握りつぶしてログのみ)
  const member = await getMember(discordId);
  const displayName =
    member?.discordUsername ??
    member?.nickname ??
    (await fetchDiscordDisplayName(discordId)) ??
    "Discord ユーザー";
  try {
    await sendDiscordDm(discordId, buildOptoutCompletedMessage(displayName));
  } catch (e) {
    console.error("Failed to send opt-out completion DM:", e);
  }

  // 運営チャンネル通知 (webhook 未設定時は no-op)
  try {
    await notifyAdminChannel(
      buildAdminOptoutNotification({
        discordId,
        discordUsername: member?.discordUsername ?? displayName,
        nickname: member?.nickname,
        lastName: member?.lastName,
        firstName: member?.firstName,
      }),
    );
  } catch (e) {
    console.error("Failed to notify admin channel (optout):", e);
  }

  // 副作用完了後は専用ページへリダイレクト (リロードでも副作用が再走しないように)
  redirect("/optout/done");
}
