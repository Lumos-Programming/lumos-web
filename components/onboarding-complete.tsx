"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function OnboardingComplete() {
  const router = useRouter()
  const [phase, setPhase] = useState(0)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 1800)
    const t3 = setTimeout(() => setPhase(3), 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  useEffect(() => {
    if (phase < 3) return
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          router.push("/internal")
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, router])

  return (
    <div
      className={[
        "fixed inset-0 flex flex-col items-center justify-center transition-colors duration-700",
        phase >= 1
          ? "bg-gray-950"
          : "bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950",
      ].join(" ")}
    >
      <div className="text-center px-8 space-y-6 max-w-lg">
        <h1
          className={[
            "text-5xl font-bold text-white transition-all duration-700",
            phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
          style={{ transitionDelay: phase >= 1 ? "0ms" : "0ms" }}
        >
          ようこそ、Lumosへ。
        </h1>

        <p
          className={[
            "text-xl text-gray-300 transition-all duration-700",
            phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          ご登録ありがとうございました。
        </p>

        <div
          className={[
            "transition-all duration-700",
            phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          ].join(" ")}
        >
          <button
            onClick={() => router.push("/internal")}
            className="mt-4 inline-flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            ダッシュボードへ →
          </button>
          {countdown > 0 && (
            <p className="mt-3 text-sm text-gray-500">{countdown}秒後に自動で移動します</p>
          )}
        </div>
      </div>
    </div>
  )
}
