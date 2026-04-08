"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type ErrorPageConfig = {
  lines: { text: string; delay: number }[];
  /** "Lumos!" を下線アニメーション付きで最終行の後に表示 */
  showLumos?: boolean;
  description: string;
  /** カウントダウン後にリダイレクトする先（未指定なら表示しない） */
  redirectTo?: string;
  /** カウントダウン秒数（デフォルト: 10） */
  redirectSeconds?: number;
};

export default function ErrorPage({ config }: { config: ErrorPageConfig }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(
    config.redirectTo ? (config.redirectSeconds ?? 10) : 0,
  );

  useEffect(() => {
    if (!config.redirectTo) return;
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
  }, [config.redirectTo]);

  useEffect(() => {
    if (config.redirectTo && countdown <= 0) {
      router.push(config.redirectTo);
    }
  }, [countdown, config.redirectTo, router]);

  const lastLineDelay = config.lines[config.lines.length - 1].delay;
  const lumosDelay = lastLineDelay + 0.3;
  const descriptionDelay =
    (config.showLumos ? lumosDelay + 0.6 : lastLineDelay) + 0.8;
  const countdownDelay = descriptionDelay + 0.6;

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
          {config.lines.map((line) => (
            <span
              key={line.text}
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight animate-[fade-in-up_0.5s_ease_both]"
              style={{ animationDelay: `${line.delay}s` }}
            >
              {line.text}
            </span>
          ))}
          {config.showLumos && (
            <span
              className="relative text-[2.5rem] sm:text-5xl font-bold text-white tracking-tight animate-[fade-in-up_0.5s_ease_both]"
              style={{ animationDelay: `${lumosDelay}s` }}
            >
              Lumos!
              <span
                className="absolute bottom-0 left-0 w-full h-[2px] bg-white animate-[authUnderlineDraw_1.5s_ease_both] origin-left"
                style={{ animationDelay: `${lumosDelay + 0.3}s` }}
              />
            </span>
          )}
        </h1>

        {/* 説明文 */}
        <p
          className="mt-8 text-lg text-[#c8cae0] leading-relaxed animate-[fade-in-up_0.5s_ease_both]"
          style={{ animationDelay: `${descriptionDelay}s` }}
        >
          {config.description.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </p>

        {/* カウントダウン */}
        {config.redirectTo && (
          <div
            className="mt-6 animate-[fade-in-up_0.5s_ease_both]"
            style={{ animationDelay: `${countdownDelay}s` }}
          >
            <p className="text-xs text-[#6b6f8a]">
              {countdown}秒後にトップへ戻ります
            </p>
          </div>
        )}
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
