"use client";

import Image from "next/image";

interface WelcomeScreenProps {
  welcomeFading: boolean;
  onDismiss: () => void;
}

export function WelcomeScreen({
  welcomeFading,
  onDismiss,
}: WelcomeScreenProps) {
  return (
    <div
      className={[
        "fixed inset-0 flex flex-col items-center justify-center bg-[#0d0f1a] overflow-hidden transition-opacity duration-500",
        welcomeFading ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* 浮遊パーティクル */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/10 pointer-events-none animate-[welcomeFloat_linear_infinite]"
          style={{
            width: `${4 + (i % 3) * 3}px`,
            height: `${4 + (i % 3) * 3}px`,
            left: `${10 + i * 11}%`,
            top: `${15 + ((i * 17) % 60)}%`,
            animationDuration: `${6 + i * 1.5}s`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* 背景グロー */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none animate-[welcomePulse_4s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(130,120,200,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xl px-4">
        {/* ロゴ — spin + scale in */}
        <div className="w-56 h-56 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/25 overflow-hidden p-4 animate-[welcomeLogoIn_1s_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <Image
            src="/assets/lumos_logo-full.png"
            alt="Lumos"
            width={168}
            height={168}
            className="object-contain"
            priority
          />
        </div>

        {/* タイトル — letter by letter fade in */}
        <h1 className="mt-10 text-4xl sm:text-5xl font-bold text-white tracking-tight text-center">
          {"Lumosへようこそ！".split("").map((char, i) => (
            <span
              key={i}
              className="inline-block animate-[welcomeLetterIn_0.4s_ease_both]"
              style={{ animationDelay: `${0.8 + i * 0.06}s` }}
            >
              {char}
            </span>
          ))}
        </h1>

        {/* バッジ — pop in */}
        <div
          className="mt-6 animate-[welcomeBadgeIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          style={{ animationDelay: "1.8s" }}
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-[#c8cae0]">
            <svg
              className="w-4 h-4 text-[#7c7fda]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx={12} cy={12} r={10} />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            3分ほどで基本情報の登録が完了します
          </span>
        </div>

        {/* ボタン — slide up */}
        <div
          className="mt-10 animate-[welcomeSlideUp_0.6s_ease_both]"
          style={{ animationDelay: "2.2s" }}
        >
          <button
            onClick={onDismiss}
            className="group inline-flex items-center gap-2 px-10 py-3.5 rounded-full text-base font-semibold text-[#0d0f1a] bg-white hover:bg-gray-100 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-black/25"
          >
            はじめる
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes welcomeFloat {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-40px) scale(1.3);
            opacity: 0.8;
          }
        }

        @keyframes welcomePulse {
          0%,
          100% {
            transform: scale(0.9);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        @keyframes welcomeLogoIn {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes welcomeLetterIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes welcomeBadgeIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes welcomeSlideUp {
          0% {
            transform: translateY(24px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
