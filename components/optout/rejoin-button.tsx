"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RejoinButton() {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRejoin() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/optout/rejoin", { method: "POST" });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(data.error ?? "再加入処理に失敗しました");
          return;
        }
        // JWT callback で token.optedOut が再評価されるようセッションを更新
        await update();
        router.replace("/internal/onboarding");
        router.refresh();
      } catch (e) {
        console.error(e);
        setError("通信エラーが発生しました");
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRejoin}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
      >
        {isPending ? "処理中…" : "再加入してオンボーディングをやり直す"}
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
