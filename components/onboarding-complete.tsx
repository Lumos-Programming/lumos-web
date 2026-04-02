"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

const MESSAGES = [
  "Hello, World! のその先へ。",
  "sudo make me a member ✓",
  "while(true) { code(); learn(); fun(); }",
  "console.log('ようこそ！')",
  "git commit -m '新メンバー追加'",
  "Segfault は出ませんでした。おめでとう！",
  "200 OK — 登録は正常に完了しました",
  "バグが1つ減りました（たぶん）",
  "// TODO: 一緒にすごいもの作る",
  "npm install lumos-member --save",
  "あなたのコードが世界を変える日も近い…かも？",
  "本番環境へデプロイしましょう。",
]

function useTypingLoop(active: boolean) {
  const [text, setText] = useState("")

  useEffect(() => {
    if (!active) return

    let cancelled = false
    let timeout: ReturnType<typeof setTimeout>
    const sleep = (ms: number) => new Promise<void>((r) => { timeout = setTimeout(r, ms) })

    async function loop() {
      let idx = 0
      while (!cancelled) {
        const msg = MESSAGES[idx % MESSAGES.length]
        for (let i = 1; i <= msg.length; i++) {
          if (cancelled) return
          setText(msg.slice(0, i))
          await sleep(30 + Math.random() * 20)
        }
        await sleep(1500)
        for (let i = msg.length - 1; i >= 0; i--) {
          if (cancelled) return
          setText(msg.slice(0, i))
          await sleep(15)
        }
        await sleep(300)
        idx++
      }
    }

    loop()
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [active])

  return text
}

export default function OnboardingComplete() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get("preview") !== null
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const start = performance.now()
    const duration = 1500
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(eased * 100)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const logoP = clamp01(progress / 40)
  const bodyP = clamp01((progress - 30) / 40)
  const buttonP = clamp01((progress - 60) / 30)
  const startTyping = bodyP > 0.9

  const typedText = useTypingLoop(startTyping)

  useEffect(() => {
    if (progress < 99 || isPreview) return
    const interval = setInterval(() => {
      setCountdown((c) => c - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [progress, isPreview])

  useEffect(() => {
    if (countdown <= 0 && !isPreview) {
      router.push("/internal")
    }
  }, [countdown, router, isPreview])

  const navigate = useCallback(() => router.push("/internal"), [router])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0d0f1a] overflow-hidden">
      {/* 背景グロー */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(130,120,200,0.12) 0%, transparent 70%)",
          opacity: logoP,
          transform: `scale(${0.6 + logoP * 0.4})`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xl px-4">
        {/* ロゴ */}
        <div
          className="w-56 h-56 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/25 overflow-hidden p-4"
          style={{
            opacity: logoP,
            transform: `scale(${0.4 + logoP * 0.6}) translateY(${(1 - logoP) * 24}px)`,
          }}
        >
          <Image
            src="/assets/lumos_logo-full.png"
            alt="Lumos"
            width={168}
            height={168}
            className="object-contain"
            priority
          />
        </div>

        {/* タイトル */}
        <h1
          className="mt-10 text-4xl sm:text-5xl font-bold text-white tracking-tight text-center"
          style={{
            opacity: bodyP,
            transform: `translateY(${(1 - bodyP) * 16}px)`,
          }}
        >
          ようこそ
        </h1>

        {/* oh-my-posh 風ターミナル行 */}
        <div
          className="mt-6 w-full min-w-[280px]"
          style={{
            opacity: bodyP,
            transform: `translateY(${(1 - bodyP) * 12}px)`,
          }}
        >
          <div className="rounded-lg bg-[#0a0c16] border border-[#1e2140] px-5 py-3.5 shadow-lg shadow-black/30">
            <div className="font-mono text-sm text-[#e8eaf6] text-center min-h-[1.5em]">
              <span className="text-[#2ecc71]">$</span>
              <span className="ml-2">{typedText}</span>
              <span className="inline-block w-[2px] h-[1.1em] bg-[#e8eaf6] ml-px align-middle animate-[blink_1s_step-end_infinite]" />
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div
          className="mt-10 transition-all duration-700 ease-out"
          style={{
            opacity: buttonP,
            transform: `translateY(${(1 - buttonP) * 12}px)`,
          }}
        >
          <button
            onClick={navigate}
            className="group inline-flex items-center gap-2 px-10 py-3.5 rounded-full text-base font-semibold text-[#0d0f1a] bg-white hover:bg-gray-100 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-black/25"
          >
            はじめる
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </button>
          <div className="mt-4 h-5 text-center">
            {isPreview ? (
              <p className="text-xs text-amber-400/70">プレビューモード</p>
            ) : countdown > 0 && buttonP > 0.5 ? (
              <p className="text-xs text-[#6b6f8a]">
                {countdown}秒後に自動で移動します
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}
