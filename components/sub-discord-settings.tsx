"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";

export type SubAccount = {
  discordId: string;
  discordUsername: string;
  discordHandle?: string;
};

interface Props {
  subAccount: SubAccount | null;
}

/**
 * SNS連携タブの Discord カード内に差し込まれるサブアカウント行。
 * 未連携時は「何ができるのか」と連携ボタンを同じ行に並べ、
 * Discord 連携の延長であることが一目で分かるようにしている。
 */
export default function SubDiscordSettings({ subAccount }: Props) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = () => {
    window.location.href = "/api/auth/link/sub-discord";
  };

  const handleDisconnect = async () => {
    if (!subAccount) return;
    if (!confirm("サブDiscordアカウントの連携を解除しますか？")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/link/sub-discord", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subDiscordId: subAccount.discordId }),
      });
      if (res.ok) {
        // 解除後の行はサーバー側の再レンダリングで消えるので、
        // それが届くまでボタンは disabled のままにする (二重送信で偽エラーが出るのを防ぐ)
        router.refresh();
        return;
      }
      alert("解除に失敗しました。");
    } catch {
      // 通信自体に失敗した場合 (オフライン等)
      alert("解除に失敗しました。通信状況を確認してください。");
    }
    setDisconnecting(false);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">サブアカウント</p>
          {subAccount ? (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 shrink-0">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </span>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              任意
            </span>
          )}
        </div>
        {subAccount ? (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              @{subAccount.discordHandle ?? subAccount.discordUsername}
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60 leading-relaxed">
              ※ 連携したサブアカウントではログインできません。
            </p>
          </>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              2つのアカウントから同時にVCへ参加したい場合にサブアカウントを1つ追加できます。
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60 leading-relaxed">
              ※ 連携したサブアカウントではログインできません。
            </p>
          </>
        )}
      </div>

      <div className="shrink-0 self-start sm:self-auto">
        {subAccount ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900 hover:border-red-400 dark:hover:border-red-700 rounded-lg px-3 py-1.5 transition-all duration-200 disabled:opacity-50"
          >
            {disconnecting ? "解除中..." : "連携解除"}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-1.5 whitespace-nowrap bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            サブアカウントを連携
          </button>
        )}
      </div>
    </div>
  );
}
