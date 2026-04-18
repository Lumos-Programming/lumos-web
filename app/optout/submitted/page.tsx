import type { Metadata } from "next";
import OptoutStatusCard from "@/components/optout/status-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OptoutSubmittedPage() {
  return (
    <OptoutStatusCard
      tone="info"
      title="Discordに最終確認のDMを送信しました"
      description={
        <>
          ご本人確認のため、Discord DMに届いた「退会処理を完了させる」ボタンから
          <strong className="text-white"> 20分以内</strong>
          に確定操作をお願いします。
        </>
      }
      extra={
        <div className="space-y-3">
          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-[#8b8fa8]">
            DMが届かない場合:
            Discordのプライバシー設定で「サーバーメンバーからのダイレクトメッセージを許可する」がオフになっている可能性があります。設定をご確認ください。
          </p>
          <p className="text-xs text-[#8b8fa8]">
            このタブはそのまま閉じていただいて構いません。
          </p>
        </div>
      }
    />
  );
}
