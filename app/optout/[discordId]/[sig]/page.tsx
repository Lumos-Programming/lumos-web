import { verifyOptoutRequest, getOptoutSubmission } from "@/lib/discord-optout";
import { getMember, isOnboardingComplete } from "@/lib/members";
import { isValidSnowflake } from "@/lib/auth";
import { sendDiscordDm, buildOptoutLinkReissueMessage } from "@/lib/discord-dm";
import { fetchDiscordDisplayName } from "@/lib/discord";
import OptoutConfirmForm from "@/components/optout/confirm-form";
import OptoutStatusCard from "@/components/optout/status-card";
import RejoinCallout from "@/components/optout/rejoin-callout";

async function resolveDisplayName(
  discordId: string,
  member: Awaited<ReturnType<typeof getMember>>,
): Promise<string> {
  const fromMember = member?.discordUsername ?? member?.nickname;
  if (fromMember) return fromMember;
  const fromDiscord = await fetchDiscordDisplayName(discordId);
  return fromDiscord ?? "Discord ユーザー";
}

export const dynamic = "force-dynamic";

async function reissueAndRender(discordId: string, displayName: string) {
  try {
    await sendDiscordDm(
      discordId,
      buildOptoutLinkReissueMessage(displayName, discordId),
    );
    return (
      <OptoutStatusCard
        tone="info"
        title="新しい退会リンクを Discord に送信しました"
        description="このリンクは無効または古いため、新しい退会リンクを Discord のDMに改めて送信しました。そちらからもう一度お試しください。"
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

export default async function OptoutPage({
  params,
}: {
  params: Promise<{ discordId: string; sig: string }>;
}) {
  const { discordId, sig } = await params;

  // 1) URL 上の discordId が Snowflake として妥当でなければ再送もしない
  if (!isValidSnowflake(discordId)) {
    return (
      <OptoutStatusCard
        tone="error"
        title="リンクを認識できませんでした"
        description="リンクが正しくないか、破損している可能性があります。Discord DMに届いた元のメッセージからもう一度お試しください。"
      />
    );
  }

  const member = await getMember(discordId);
  const displayName = await resolveDisplayName(discordId, member);

  // 2) 既に opt-out 確定済みなら sig 検証より先に終状態を返す。
  //    AUTH_SECRET ローテ等で過去リンクが invalid になっていても「受付済み」を表示する方が親切で、
  //    確定済みユーザーに不要な再発行 DM を送らずに済む。
  const existing = await getOptoutSubmission(discordId);
  if (existing) {
    return (
      <OptoutStatusCard
        tone="success"
        title="受付済みです"
        description={`${displayName} さんの退会の意思表示を受け付けています。Discordサーバーには引き続き参加いただけますが、4月末を目処にメンバー用チャンネルは閲覧できなくなります。`}
        extra={<RejoinCallout />}
      />
    );
  }

  // 3) 署名検証 — 失敗時は新しい退会リンクを Discord DM で再送
  const result = verifyOptoutRequest(discordId, sig);
  if (!result.ok) {
    return reissueAndRender(discordId, displayName);
  }

  // 4) 登録完了済み
  if (member && isOnboardingComplete(member)) {
    return (
      <OptoutConfirmForm
        discordId={discordId}
        sig={sig}
        displayName={displayName}
        notice={{
          title: "Lumos Webの登録は完了しています",
          body: "すでにLumos Webへの登録は完了しています。退会手続きを進めると、メンバー情報は削除されます。アカウント・プロフィールの扱いについてご質問があれば、運営メンバーに直接ご連絡ください。",
        }}
      />
    );
  }

  // 5) オンボーディング途中
  if (member && !isOnboardingComplete(member)) {
    return (
      <OptoutConfirmForm
        discordId={discordId}
        sig={sig}
        displayName={displayName}
        notice={{
          title: "オンボーディング途中です",
          body: "Lumos Webへのログインは済んでいますが、オンボーディングが未完了の状態です。継続する場合は先にオンボーディングを完了してください。継続しない場合は、このまま下の手続きをお進めください。",
        }}
      />
    );
  }

  // 6) 未登録（通常フロー）
  return (
    <OptoutConfirmForm
      discordId={discordId}
      sig={sig}
      displayName={displayName}
    />
  );
}
