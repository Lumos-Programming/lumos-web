"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LineGroupJoinNoticeProps {
  onGroupJoined: () => void;
}

export function LineGroupJoinNotice({
  onGroupJoined,
}: LineGroupJoinNoticeProps) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resent, setResent] = useState(false);

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

  const handleResend = async () => {
    setResending(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/line-group/resend-invite", {
        method: "POST",
      });
      if (!res.ok) {
        setErrorMessage("再送信に失敗しました。もう一度お試しください。");
        return;
      }
      setResent(true);
    } catch {
      setErrorMessage("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">
        LINEグループへの参加が必要です
      </p>
      <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
        LINEのDMにグループ招待リンクを送信しました。LINEアプリを確認してグループに参加してください。
      </p>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={resending || resent}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/50"
        >
          {resent ? "送信済み" : resending ? "送信中..." : "招待リンクを再送信"}
        </Button>
      </div>
      {errorMessage && (
        <p className="text-xs text-red-500 mt-2">{errorMessage}</p>
      )}
    </div>
  );
}
