"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const LINES = [
  { text: "Oops!", delay: 0.3 },
  { text: "Looks like", delay: 0.6 },
  { text: "invisible dragons", delay: 0.9 },
  { text: "ain't letting you in", delay: 1.2 },
];

export default function AuthError() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      router.push("/");
    }
  }, [countdown, router]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0d0f1a] overflow-hidden">
      {/* 背景パーティクル */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none animate-[authOrbit_linear_infinite]"
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

      {/* 背景グロー */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none animate-[authGlow_5s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(88,101,242,0.08) 0%, rgba(130,120,200,0.06) 40%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-start w-full max-w-md px-6">
        {/* アニメーションテキスト */}
        <h1 className="flex flex-col items-start gap-1">
          {LINES.map((line) => (
            <span
              key={line.text}
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight animate-[fade-in-up_0.5s_ease_both]"
              style={{ animationDelay: `${line.delay}s` }}
            >
              {line.text}
            </span>
          ))}
          {/* Lumos! — 大きいフォント + 下線アニメーション */}
          <span
            className="relative text-[2.5rem] sm:text-5xl font-bold text-white tracking-tight animate-[fade-in-up_0.5s_ease_both]"
            style={{ animationDelay: "1.5s" }}
          >
            Lumos!
            <span
              className="absolute bottom-0 left-0 w-full h-[2px] bg-white animate-[authUnderlineDraw_1.5s_ease_both] origin-left"
              style={{ animationDelay: "1.8s" }}
            />
          </span>
        </h1>

        {/* メッセージ */}
        <p
          className="mt-8 text-lg text-[#c8cae0] leading-relaxed animate-[fade-in-up_0.5s_ease_both]"
          style={{ animationDelay: "2.4s" }}
        >
          認証したアカウントが
          <br />
          Lumosに存在しているか
          <br />
          確認しましょう
        </p>

        {/* カウントダウン */}
        <div
          className="mt-6 animate-[fade-in-up_0.5s_ease_both]"
          style={{ animationDelay: "3.0s" }}
        >
          <p className="text-xs text-[#6b6f8a]">
            {countdown}秒後にトップへ戻ります
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes authOrbit {
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
        @keyframes authGlow {
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
        @keyframes authUnderlineDraw {
          0% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
