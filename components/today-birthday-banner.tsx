"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Cake } from "lucide-react";
import Link from "next/link";

interface TodayBirthdayBannerProps {
  names: string[];
}

export function TodayBirthdayBanner({ names }: TodayBirthdayBannerProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // 左右から紙吹雪を打ち上げる
    const end = Date.now() + 3000;
    const colors = ["#9333ea", "#3b82f6", "#f59e0b", "#10b981", "#ec4899"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const label =
    names.length === 1
      ? `${names[0]}さん`
      : `${names.slice(0, -1).join("さん・")}さん・${names[names.length - 1]}さん`;

  return (
    <Link href="/internal/birthdays">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-4 text-white cursor-pointer hover:opacity-95 transition-opacity">
        <div className="absolute inset-0 bg-grid-white/[0.07] bg-[size:16px_16px]" />
        <div className="relative z-10 flex items-center gap-3">
          <Cake className="h-6 w-6 shrink-0" />
          <p className="font-semibold text-sm sm:text-base">
            今日は {label} の誕生日です！おめでとうございます
          </p>
        </div>
      </div>
    </Link>
  );
}
