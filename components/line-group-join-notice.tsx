"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LineGroupJoinNoticeProps {
  lineBotFriendUrl?: string;
  onGroupJoined: () => void;
}

export function LineGroupJoinNotice({
  lineBotFriendUrl,
  onGroupJoined,
}: LineGroupJoinNoticeProps) {
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCheck = async () => {
    setChecking(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/line-group/check-membership");
      if (!res.ok) {
        setErrorMessage("確認に失敗しました。もう一度お試しください。");
        return;
      }
      const data = await res.json();
      if (data.isMember) {
        onGroupJoined();
      } else {
        setErrorMessage(
          "まだグループへの参加が確認できません。LINEアプリからグループに参加した後、もう一度お試しください。",
        );
      }
    } catch {
      setErrorMessage("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">
        LINEグループへの参加が必要です
      </p>
      <div className="mb-3">
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
          まずLumos公式アカウントを友だち追加してください。追加後、招待リンクが届きます。
        </p>
        <a
          href={lineBotFriendUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs bg-[#06C755] hover:bg-[#05a848] text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          公式アカウントを友だち追加
        </a>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheck}
          disabled={checking}
          className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          {checking ? "確認中..." : "参加を確認"}
        </Button>
      </div>
      {errorMessage && (
        <p className="text-xs text-red-500 mt-2">{errorMessage}</p>
      )}
    </div>
  );
}
