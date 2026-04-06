"use client";

import type { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { RingColorKey } from "@/types/member";
import { ExternalTilePreview } from "@/components/member-tile-preview";
import { CheckCircleIcon } from "./types";
import type { FormData } from "./types";

interface Step7AvatarProps {
  form: FormData;
  faceImageUrl: string;
  primaryAvatar: "face" | "discord" | "line" | "default";
  setPrimaryAvatar: Dispatch<
    SetStateAction<"face" | "discord" | "line" | "default">
  >;
  ringColor: RingColorKey;
  discordId: string;
  discordAvatar: string;
  lineLinked: boolean;
  lineAvatar: string;
  onbExternalPreview: {
    main: string;
    sub?: string;
    department: string;
    year: string;
    image: string;
  };
  submitting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

export function Step7Avatar({
  form,
  faceImageUrl,
  primaryAvatar,
  setPrimaryAvatar,
  ringColor,
  discordId,
  discordAvatar,
  lineLinked,
  lineAvatar,
  onbExternalPreview,
  submitting,
  onComplete,
  onBack,
}: Step7AvatarProps) {
  return (
    <div className="p-8">
      <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
          HP掲載用の画像
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          最後のステップです！外部サイトに表示する画像を選んでください。
        </p>
      </div>

      <div className="space-y-6 animate-[fadeInUp_300ms_60ms_ease_both]">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            前の画面で「HPにメンバー情報を掲載する」を選択しています。LumosのHP（公開サイト）のメンバー一覧に表示される画像を選んでください。顔写真を公開したくない場合は、SNSアイコンやデフォルト画像を選べます。
          </p>
        </div>

        {/* ライブプレビュー */}
        <div className="flex justify-center">
          <div className="w-44">
            <ExternalTilePreview
              label="表示プレビュー"
              allowPublic={true}
              data={{
                ...onbExternalPreview,
                image: (() => {
                  switch (primaryAvatar) {
                    case "face":
                      return faceImageUrl || "/placeholder.svg";
                    case "discord":
                      return discordAvatar
                        ? discordAvatar.startsWith("http")
                          ? discordAvatar
                          : `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`
                        : "/placeholder.svg";
                    case "line":
                      return lineAvatar || "/placeholder.svg";
                    case "default":
                      return "/placeholder.svg";
                  }
                })(),
                ringColor,
                memberType: form.memberType || undefined,
                currentOrg: form.currentOrg || undefined,
              }}
            />
          </div>
        </div>

        {/* 画像選択 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            画像を選択
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: "face" as const,
                label: "顔写真",
                desc: faceImageUrl ? "アップロードした写真" : "未設定",
                src: faceImageUrl || "/placeholder.svg",
                enabled: true,
              },
              {
                value: "discord" as const,
                label: "Discord",
                desc: "Discordアイコン",
                src: discordAvatar
                  ? discordAvatar.startsWith("http")
                    ? discordAvatar
                    : `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`
                  : "/placeholder.svg",
                enabled: !!discordAvatar,
              },
              {
                value: "line" as const,
                label: "LINE",
                desc: "LINEアイコン",
                src: lineAvatar || "/placeholder.svg",
                enabled: lineLinked && !!lineAvatar,
              },
              {
                value: "default" as const,
                label: "なし",
                desc: "デフォルト画像",
                src: "/placeholder.svg",
                enabled: true,
              },
            ].map(({ value, label, desc, src, enabled }) => (
              <button
                key={value}
                type="button"
                disabled={!enabled}
                onClick={() => setPrimaryAvatar(value)}
                className={[
                  "flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200",
                  primaryAvatar === value
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-600"
                    : "border-gray-200 dark:border-gray-700",
                  !enabled
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer hover:border-purple-300",
                ].join(" ")}
              >
                <div className="w-10 h-10 relative rounded-full overflow-hidden flex-shrink-0">
                  <Image src={src} alt="" fill className="object-cover" />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {label}
                  </span>
                  {primaryAvatar === value && (
                    <CheckCircleIcon className="inline-block w-4 h-4 ml-1 text-purple-600 dark:text-purple-400" />
                  )}
                  <p className="text-[11px] text-muted-foreground truncate">
                    {desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_120ms_ease_both]">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        <Button
          onClick={onComplete}
          disabled={submitting}
          className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30"
        >
          {submitting ? "登録中..." : "登録完了"}
        </Button>
      </div>
    </div>
  );
}
