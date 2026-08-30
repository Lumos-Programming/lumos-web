"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

interface Props {
  subAccount: {
    discordId: string;
    discordUsername: string;
    discordHandle?: string;
  } | null;
}

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
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">サブDiscordアカウント</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          画面共有等で複数アカウントから同時に Voice Chat
          に参加するためのサブアカウントを 1
          つだけ連携できます。連携したサブアカウントでは Lumos Web
          にログインできません。
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 p-4 border rounded-xl bg-card hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[#5865F2] rounded-xl flex items-center justify-center text-white shrink-0">
            <DiscordIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">サブDiscord</p>
              {subAccount && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              )}
            </div>
            {subAccount ? (
              <p className="text-xs text-muted-foreground truncate">
                @{subAccount.discordHandle ?? subAccount.discordUsername}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60">未連携</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
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
              className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <DiscordIcon className="w-4 h-4" />
              Discordで連携
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
