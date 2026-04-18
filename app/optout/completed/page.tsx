import type { Metadata } from "next";
import OptoutStatusCard from "@/components/optout/status-card";
import RejoinButton from "@/components/optout/rejoin-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OptoutCompletedPage() {
  return (
    <OptoutStatusCard
      tone="info"
      title="退会済みのアカウントです"
      description="このアカウントは退会処理が完了しているため、Lumos Webのメンバー向け機能にはアクセスいただけません。Discordサーバーには引き続き参加いただけますが、メンバー用チャンネルは閲覧できなくなります。再加入を希望される場合は下のボタンからオンボーディングをやり直してください。"
      extra={<RejoinButton />}
    />
  );
}
