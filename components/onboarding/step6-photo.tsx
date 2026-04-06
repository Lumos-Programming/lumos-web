"use client";

import type { Dispatch, SetStateAction, ChangeEvent, RefObject } from "react";
import Image from "next/image";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { getRingColorClass } from "@/types/member";
import type { RingColorKey } from "@/types/member";
import { RingColorPicker } from "@/components/ring-color-picker";
import { LiquidSplashEffect } from "@/components/liquid-splash-effect";

interface Step6PhotoProps {
  faceImageUrl: string;
  ringColor: RingColorKey;
  setRingColor: Dispatch<SetStateAction<RingColorKey>>;
  cropImageSrc: string | null;
  setCropImageSrc: Dispatch<SetStateAction<string | null>>;
  crop: { x: number; y: number };
  setCrop: Dispatch<SetStateAction<{ x: number; y: number }>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  setCroppedAreaPixels: Dispatch<SetStateAction<Area | null>>;
  imageUploading: boolean;
  blobAnimating: boolean;
  setBlobAnimating: Dispatch<SetStateAction<boolean>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  handleCropConfirm: () => void;
  isFinalStep: boolean;
  submitting: boolean;
  onComplete: () => void;
  onNextStep: () => void;
  onBack: () => void;
}

export function Step6Photo({
  faceImageUrl,
  ringColor,
  setRingColor,
  cropImageSrc,
  setCropImageSrc,
  crop,
  setCrop,
  zoom,
  setZoom,
  setCroppedAreaPixels,
  imageUploading,
  blobAnimating,
  setBlobAnimating,
  fileInputRef,
  handleFileSelect,
  handleCropConfirm,
  isFinalStep,
  submitting,
  onComplete,
  onNextStep,
  onBack,
}: Step6PhotoProps) {
  return (
    <div className="p-8">
      <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
          プロフィール顔写真を設定
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {isFinalStep ? "最後のステップです！" : "あと少しで完了です！"}
        </p>
      </div>

      <div className="space-y-6 animate-[fadeInUp_300ms_60ms_ease_both]">
        {/* 背景説明 + 公開範囲の補足 */}
        <div className="space-y-2">
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
              顔がわかる写真を設定しませんか？
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
              Lumosメンバーページでは、プロフィール顔写真の設定を推奨しています。
              <br />
              メンバー一覧ページで他のメンバーの顔ぶれを確認できるだけでなく、対面イベントやキャンパスですれ違ったときに声をかけてもらいやすくなります。
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
            <svg
              className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
            </svg>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              プロフィール顔写真の公開範囲は自由に設定できます。
            </p>
          </div>
        </div>

        {/* Face image preview + floating sample bubbles */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-64 h-64 flex items-center justify-center overflow-visible">
            {/* Floating sample headshot bubbles */}
            {!cropImageSrc &&
              (
                [
                  {
                    src: "/assets/sample-headshots/sample-1.webp",
                    size: 44,
                    top: "2%",
                    left: "0%",
                    delay: "0s",
                    duration: "5s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-2.webp",
                    size: 36,
                    top: "8%",
                    right: "2%",
                    delay: "0.8s",
                    duration: "6s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-3.webp",
                    size: 40,
                    top: "55%",
                    left: "-4%",
                    delay: "1.5s",
                    duration: "5.5s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-4.webp",
                    size: 34,
                    top: "60%",
                    right: "0%",
                    delay: "0.3s",
                    duration: "6.5s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-5.webp",
                    size: 30,
                    top: "85%",
                    left: "18%",
                    delay: "2s",
                    duration: "5.8s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-6.webp",
                    size: 32,
                    top: "88%",
                    right: "16%",
                    delay: "1.2s",
                    duration: "6.2s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-7.webp",
                    size: 28,
                    top: "30%",
                    left: "-8%",
                    delay: "0.5s",
                    duration: "5.3s",
                  },
                  {
                    src: "/assets/sample-headshots/sample-8.webp",
                    size: 26,
                    top: "35%",
                    right: "-4%",
                    delay: "1.8s",
                    duration: "6.8s",
                  },
                ] as {
                  src: string;
                  size: number;
                  top: string;
                  left?: string;
                  right?: string;
                  delay: string;
                  duration: string;
                }[]
              ).map((b, i) => (
                <div
                  key={i}
                  className="absolute animate-float-bubble rounded-full overflow-hidden ring-2 ring-white/80 dark:ring-white/20 shadow-lg opacity-60"
                  style={{
                    width: b.size,
                    height: b.size,
                    top: b.top,
                    left: b.left,
                    right: b.right,
                    animationDelay: b.delay,
                    animationDuration: b.duration,
                  }}
                >
                  <Image
                    src={b.src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes={`${b.size}px`}
                  />
                </div>
              ))}
            {/* Main preview circle */}
            {blobAnimating && (
              <LiquidSplashEffect
                width={256}
                height={256}
                onComplete={() => setBlobAnimating(false)}
              />
            )}
            <div
              className={`w-32 h-32 relative rounded-full overflow-hidden ring-4 ${getRingColorClass(ringColor)} z-10 ${blobAnimating ? "animate-liquid-pop" : ""}`}
            >
              <Image
                src={faceImageUrl || "/assets/lumos_logo-full.png"}
                alt="プロフィール画像"
                fill
                className="object-cover"
              />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="gap-2"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
              />
              <circle cx={12} cy={13} r={4} />
            </svg>
            {faceImageUrl ? "画像を変更" : "画像を選択"}
          </Button>
        </div>

        {/* Crop dialog */}
        {cropImageSrc && (
          <div className="space-y-4">
            <div className="relative w-full" style={{ height: 300 }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedAreaPixels(area)}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex-shrink-0">
                ズーム
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={() => setCropImageSrc(null)}>
                キャンセル
              </Button>
              <Button
                onClick={handleCropConfirm}
                disabled={imageUploading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                {imageUploading ? "アップロード中..." : "切り抜き"}
              </Button>
            </div>
          </div>
        )}

        {faceImageUrl && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
            <svg
              className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
            </svg>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              プロフィール設定からいつでも変更できます。
            </p>
          </div>
        )}

        <RingColorPicker
          value={ringColor}
          onChange={setRingColor}
          description="アバターの周りに表示されるカラーリングを選べます。"
        />
      </div>

      <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        {faceImageUrl ? (
          isFinalStep ? (
            <Button
              onClick={onComplete}
              disabled={submitting}
              className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30"
            >
              {submitting ? "登録中..." : "登録完了"}
            </Button>
          ) : (
            <Button
              onClick={onNextStep}
              className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30"
            >
              次へ →
            </Button>
          )
        ) : isFinalStep ? (
          <Button
            onClick={onComplete}
            disabled={submitting}
            variant="ghost"
            className="text-muted-foreground"
          >
            {submitting ? "登録中..." : "あとで設定する"}
          </Button>
        ) : (
          <Button
            onClick={onNextStep}
            variant="ghost"
            className="text-muted-foreground"
          >
            あとで設定する
          </Button>
        )}
      </div>
    </div>
  );
}
