"use client";

import Image from "next/image";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function OnboardingLogin() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0d0f1a] overflow-hidden">
      {/* 背景パーティクル */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none animate-[loginOrbit_linear_infinite]"
          style={{
            width: `${3 + (i % 3) * 2}px`,
            height: `${3 + (i % 3) * 2}px`,
            background:
              i % 2 === 0 ? "rgba(88,101,242,0.3)" : "rgba(130,120,200,0.25)",
            left: `${12 + i * 14}%`,
            top: `${20 + ((i * 19) % 55)}%`,
            animationDuration: `${8 + i * 2}s`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {/* 背景グロー — 呼吸アニメーション */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none animate-[loginGlow_5s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(88,101,242,0.08) 0%, rgba(130,120,200,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        {/* ロゴ — ドロップ + バウンス */}
        <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/25 overflow-hidden p-3 animate-[loginLogoDrop_0.8s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <Image
            src="/assets/lumos_logo-full.png"
            alt="Lumos"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>

        {/* タイトル — ブラーから出現 */}
        <h1 className="mt-8 text-3xl sm:text-4xl font-bold text-white tracking-tight text-center animate-[loginTextReveal_0.7s_ease_0.5s_both]">
          メンバー登録
        </h1>

        {/* 説明 — フェードイン */}
        <p className="mt-6 text-[#c8cae0] text-sm leading-relaxed text-center animate-[loginFadeIn_0.6s_ease_0.8s_both]">
          Lumosのメンバー登録を行います。
          <br />
          まず本人確認のため、<strong className="text-white">Discord</strong>
          でログインしてください。
        </p>

        {/* Callout — スライドイン */}
        <div className="mt-5 w-full flex gap-3 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 animate-[loginSlideIn_0.5s_cubic-bezier(0.25,0.46,0.45,0.94)_1.1s_both]">
          <svg
            className="w-5 h-5 text-[#5865F2] flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx={12} cy={12} r={10} />
            <line x1={12} y1={16} x2={12} y2={12} />
            <line x1={12} y1={8} x2={12.01} y2={8} />
          </svg>
          <p className="text-sm text-[#c8cae0] leading-relaxed">
            Discordサーバー「
            <strong className="text-white">Lumos-プログラミングサークル</strong>
            」に参加済みのアカウントでログインしてください。
          </p>
        </div>

        {/* ログインボタン — スケールアップ + グロー */}
        <div className="mt-8 w-full animate-[loginButtonIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)_1.4s_both]">
          <a
            href="/login?callbackUrl=/internal/onboarding"
            className="group relative flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.97] transition-all duration-200 shadow-lg shadow-[#5865F2]/25 overflow-hidden"
          >
            {/* ボタン上のシマー */}
            <span className="absolute inset-0 animate-[loginShimmer_3s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full" />
            <DiscordIcon className="w-5 h-5 relative" />
            <span className="relative">Discordでログイン</span>
          </a>
          <p className="mt-3 text-center text-xs text-[#6b6f8a] animate-[loginFadeIn_0.5s_ease_1.8s_both]">
            ログイン後、メンバー情報の入力に進みます
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes loginOrbit {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          50% {
            transform: translateY(-50px) translateX(20px) scale(1.4);
            opacity: 0.4;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
        }
        @keyframes loginGlow {
          0%,
          100% {
            transform: scale(0.85);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
        @keyframes loginLogoDrop {
          0% {
            transform: scale(0.3) translateY(-60px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes loginTextReveal {
          0% {
            opacity: 0;
            filter: blur(12px);
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0);
          }
        }
        @keyframes loginFadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes loginSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes loginButtonIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes loginShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
