import type { Metadata } from "next";
import OptoutStatusCard from "@/components/optout/status-card";
import RejoinCallout from "@/components/optout/rejoin-callout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OptoutDonePage() {
  return (
    <OptoutStatusCard
      tone="success"
      title="退会処理が完了しました"
      description="退会の意思表示を受け付けました。Discordサーバーには引き続き参加いただけますが、4月末を目処にメンバー用チャンネルは閲覧できなくなります。"
      extra={<RejoinCallout />}
    />
  );
}
