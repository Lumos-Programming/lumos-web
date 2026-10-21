"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerDebugProfile } from "@/lib/debug-profile";

export function DebugProfileButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRegister() {
    setError(null);
    startTransition(async () => {
      const result = await registerDebugProfile();
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/internal");
      router.refresh();
    });
  }

  return (
    <aside className="fixed right-4 top-4 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
      <div className="mb-3 flex gap-3">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">開発環境のみ</p>
          <p className="mt-1 text-xs leading-relaxed opacity-80">
            サンプル情報を登録してオンボーディングをスキップします。
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={isPending}
        onClick={handleRegister}
      >
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isPending ? "登録中..." : "デバッグプロフィールを登録"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </aside>
  );
}
