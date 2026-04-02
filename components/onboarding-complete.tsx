"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

export default function OnboardingComplete() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get("preview") !== null
  const [phase, setPhase] = useState(0)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1400)
    const t3 = setTimeout(() => setPhase(3), 2400)
    const t4 = setTimeout(() => setPhase(4), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  useEffect(() => {
    if (phase < 4 || isPreview) return
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
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1e2235 0%, #2a2f48 40%, #1a1e30 100%)" }}
    >
      {/* 背景グロー */}
      <div
        className={[
          "absolute w-[500px] h-[500px] rounded-full transition-all duration-[2500ms] ease-out",
          phase >= 1 ? "opacity-20 scale-100" : "opacity-0 scale-50",
        ].join(" ")}
        style={{
          background: "radial-gradient(circle, #7c6fc4 0%, #4a5080 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className={[
          "absolute w-[300px] h-[300px] rounded-full transition-all duration-[3000ms] ease-out",
          phase >= 2 ? "opacity-15 scale-100 translate-x-32 -translate-y-16" : "opacity-0 scale-50",
        ].join(" ")}
        style={{
          background: "radial-gradient(circle, #8b7fd4 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg">
        {/* ロゴ */}
        <div
          className={[
            "mb-8 transition-all duration-1000 ease-out",
            phase >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75",
          ].join(" ")}
        >
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg shadow-black/20">
            <Image
              src="/assets/Lumoslogo.png"
              alt="Lumos"
              width={52}
              height={52}
              className="brightness-0 invert opacity-90"
            />
          </div>
        </div>

        {/* タイトル */}
        <h1
          className={[
            "text-4xl sm:text-5xl font-bold tracking-tight transition-all duration-1000 ease-out",
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          <span className="text-white/95">ようこそ、</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a89ed8] to-[#8b9cf7]">
            Lumos
          </span>
          <span className="text-white/95">へ</span>
        </h1>

        {/* 区切り線 */}
        <div
          className={[
            "mt-5 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000",
            phase >= 2 ? "w-48 opacity-100" : "w-0 opacity-0",
          ].join(" ")}
        />

        {/* サブテキスト */}
        <p
          className={[
            "mt-5 text-base sm:text-lg text-[#9a9bb8] transition-all duration-700",
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          ].join(" ")}
        >
          登録が完了しました。一緒に楽しみましょう。
        </p>

        {/* ボタン */}
        <div
          className={[
            "mt-8 transition-all duration-700",
            phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          ].join(" ")}
        >
          <button
            onClick={() => router.push("/internal")}
            className="group inline-flex items-center gap-2.5 px-8 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-300 bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 hover:border-white/25 hover:shadow-lg hover:shadow-black/20 active:scale-[0.97]"
          >
            ダッシュボードへ
            <span className="transition-transform duration-200 group-hover:translate-x-0.5 text-white/60 group-hover:text-white/90">→</span>
          </button>
          <div className="mt-4 h-5">
            {isPreview ? (
              <p className="text-xs text-amber-400/70">プレビューモード — 自動リダイレクト無効</p>
            ) : countdown > 0 && phase >= 4 ? (
              <p className="text-xs text-white/30">{countdown}秒後に自動で移動します</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
