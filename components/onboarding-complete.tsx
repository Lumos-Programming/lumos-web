"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function OnboardingComplete() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get("preview") !== null
  const [phase, setPhase] = useState(0)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1600)
    const t3 = setTimeout(() => setPhase(3), 2800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  useEffect(() => {
    if (phase < 3 || isPreview) return
    const interval = setInterval(() => {
      setCountdown((c) => c - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, isPreview])

  useEffect(() => {
    if (countdown <= 0 && !isPreview) {
      router.push("/internal")
    }
  }, [countdown, router, isPreview])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gray-950">
      {/* 背景グロー */}
      <div
        className={[
          "absolute w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-[2000ms]",
          phase >= 1
            ? "opacity-30 scale-100"
            : "opacity-0 scale-50",
        ].join(" ")}
        style={{
          background: "radial-gradient(circle, #a855f7 0%, #6366f1 50%, transparent 70%)",
        }}
      />

      {/* パーティクル風の光点 */}
      {phase >= 2 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-purple-400/60 animate-pulse"
              style={{
                top: `${20 + Math.sin(i * 1.2) * 30}%`,
                left: `${15 + (i * 13) % 70}%`,
                animationDelay: `${i * 300}ms`,
                animationDuration: `${2000 + i * 400}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 text-center px-8 space-y-8 max-w-2xl">
        {/* メインタイトル */}
        <div className="space-y-2">
          <h1
            className={[
              "text-6xl sm:text-7xl font-extrabold tracking-tight whitespace-nowrap transition-all duration-1000",
              phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            ].join(" ")}
          >
            <span className="bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
              Welcome to Lumos
            </span>
          </h1>
          <div
            className={[
              "h-0.5 mx-auto bg-gradient-to-r from-transparent via-purple-500 to-transparent transition-all duration-1000",
              phase >= 1 ? "w-48 opacity-100" : "w-0 opacity-0",
            ].join(" ")}
          />
        </div>

        {/* サブテキスト */}
        <p
          className={[
            "text-lg sm:text-xl text-gray-400 transition-all duration-700",
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          登録が完了しました。一緒に楽しみましょう。
        </p>

        {/* ボタン + カウントダウン */}
        <div
          className={[
            "transition-all duration-700",
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          <button
            onClick={() => router.push("/internal")}
            className="group relative inline-flex items-center gap-2 px-10 py-3.5 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            はじめる
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </button>
          <div className="mt-4">
            {isPreview ? (
              <p className="text-sm text-yellow-400/80">プレビューモード — 自動リダイレクト無効</p>
            ) : countdown > 0 ? (
              <p className="text-sm text-gray-600">{countdown}秒後に自動で移動します</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
