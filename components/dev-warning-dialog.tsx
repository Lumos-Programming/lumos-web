"use client"

import { useState } from "react"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function DevWarningDialog({ envLabel }: { envLabel: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  function handleDismiss() {
    document.cookie = `staging_acknowledged=1; path=/; max-age=${COOKIE_MAX_AGE}`
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="relative mx-4 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-12 shadow-2xl">
        {/* Accent gradient bar */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

        <div className="space-y-8 pt-2">
          {/* Badge + Title */}
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-amber-400">
              {envLabel}
            </span>
            <h2 className="text-3xl font-bold text-white">
              この環境は公開用ではありません
            </h2>
          </div>

          {/* Description */}
          <p className="text-lg leading-relaxed text-zinc-400">
            現在 <span className="font-medium text-zinc-200">{envLabel}</span> 環境にアクセスしています。
            <br />
            一般の方は<strong className="text-zinc-200">本番環境 lumos-ynu.jp</strong> をご覧ください。
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-4 pt-2">
            <a
              href="https://lumos-ynu.jp"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-base font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              lumos-ynu.jp へ移動
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <button
              onClick={handleDismiss}
              className="rounded-xl border border-zinc-700 px-6 py-4 text-base font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              関係者です — 続行する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
