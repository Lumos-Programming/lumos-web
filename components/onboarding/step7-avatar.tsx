"use client";

import {
  useState,
  useRef,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RingColorKey } from "@/types/member";
import type { PublicImageOption } from "@/lib/members";
import { ExternalTilePreview } from "@/components/member-tile-preview";
import { toast } from "@/hooks/use-toast";
import { cropAndResizeImage } from "@/lib/image-crop";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { CheckCircleIcon } from "./types";
import type { FormData } from "./types";

interface Step7AvatarProps {
  form: FormData;
  faceImageUrl: string;
  customPublicImageUrl: string;
  setCustomPublicImageUrl: (url: string) => void;
  publicImageOption: PublicImageOption;
  setPublicImageOption: Dispatch<SetStateAction<PublicImageOption>>;
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
    primaryAvatar: string;
  };
  submitting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

export function Step7Avatar({
  form,
  faceImageUrl,
  customPublicImageUrl,
  setCustomPublicImageUrl,
  publicImageOption,
  setPublicImageOption,
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
  const [dialogOpen, setDialogOpen] = useState(false);

  // Custom image upload dialog state
  const customFileRef = useRef<HTMLInputElement>(null);
  const [customCropSrc, setCustomCropSrc] = useState<string | null>(null);
  const [customCrop, setCustomCrop] = useState({ x: 0, y: 0 });
  const [customZoom, setCustomZoom] = useState(1);
  const [customCroppedArea, setCustomCroppedArea] = useState<Area | null>(null);
  const [customUploading, setCustomUploading] = useState(false);

  const handleCustomFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleCustomCropConfirm = useCallback(async () => {
    if (!customCropSrc || !customCroppedArea) return;
    setCustomUploading(true);
    try {
      const blob = await cropAndResizeImage(customCropSrc, customCroppedArea, {
        maxSize: 1024,
      });
      const formData = new FormData();
      formData.append("image", blob, "custom.webp");
      formData.append("type", "custom");
      const res = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const { url } = await res.json();
        setCustomPublicImageUrl(url);
        setCustomCropSrc(null);
        setDialogOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "アップロードに失敗しました",
          description: data.error || "しばらく経ってから再度お試しください。",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "アップロードに失敗しました",
        description:
          "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
      });
    } finally {
      setCustomUploading(false);
    }
  }, [customCropSrc, customCroppedArea, setCustomPublicImageUrl]);

  const resolvePreviewAvatar = (): string => {
    switch (publicImageOption) {
      case "face":
        return faceImageUrl || "/assets/lumos_logo-full.png";
      case "discord":
        return discordAvatar
          ? discordAvatar.startsWith("http")
            ? discordAvatar
            : `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`
          : "/assets/lumos_logo-full.png";
      case "line":
        return lineAvatar || "/assets/lumos_logo-full.png";
      case "custom":
        return customPublicImageUrl || "/assets/lumos_logo-full.png";
      case "default":
        return "/assets/lumos_logo-full.png";
    }
  };

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
                primaryAvatar: resolvePreviewAvatar(),
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
                src: faceImageUrl || "/assets/lumos_logo-full.png",
                enabled: !!faceImageUrl,
              },
              {
                value: "discord" as const,
                label: "Discord",
                desc: "Discordアイコン",
                src: discordAvatar
                  ? discordAvatar.startsWith("http")
                    ? discordAvatar
                    : `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`
                  : "/assets/lumos_logo-full.png",
                enabled: !!discordAvatar,
              },
              {
                value: "line" as const,
                label: "LINE",
                desc: "LINEアイコン",
                src: lineAvatar || "/assets/lumos_logo-full.png",
                enabled: lineLinked && !!lineAvatar,
              },
              {
                value: "custom" as const,
                label: "カスタム",
                desc: customPublicImageUrl
                  ? "アップロードした画像"
                  : "画像をアップロード",
                src: customPublicImageUrl || "/assets/lumos_logo-full.png",
                enabled: true,
              },
              {
                value: "default" as const,
                label: "なし",
                desc: "デフォルト画像",
                src: "/assets/lumos_logo-full.png",
                enabled: true,
              },
            ].map(({ value, label, desc, src, enabled }) => (
              <button
                key={value}
                type="button"
                disabled={!enabled}
                onClick={() => {
                  setPublicImageOption(value);
                  if (value === "custom") setDialogOpen(true);
                }}
                className={[
                  "flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200",
                  publicImageOption === value
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
                  {publicImageOption === value && (
                    <CheckCircleIcon className="inline-block w-4 h-4 ml-1 text-purple-600 dark:text-purple-400" />
                  )}
                  <p className="text-[11px] text-muted-foreground truncate">
                    {desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* カスタム選択済み時の変更ボタン */}
          {publicImageOption === "custom" && customPublicImageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              カスタム画像を変更
            </Button>
          )}
        </div>
      </div>

      {/* カスタム画像アップロードダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>カスタム公開画像</DialogTitle>
            <DialogDescription>
              顔写真とは別に、公開ページ用の画像を設定できます
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 relative rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-200 dark:border-gray-700">
                <Image
                  src={customPublicImageUrl || "/assets/lumos_logo-full.png"}
                  alt="カスタム画像"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  ref={customFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCustomFile}
                />
                <div className="flex gap-2">
                  {customPublicImageUrl && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setDialogOpen(false)}
                    >
                      この画像を使う
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => customFileRef.current?.click()}
                    disabled={customUploading}
                  >
                    {customPublicImageUrl ? "別の画像を選択" : "画像を選択"}
                  </Button>
                </div>
                {!customCropSrc && !customPublicImageUrl && (
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP に対応（2MB以下）
                  </p>
                )}
              </div>
            </div>

            {customCropSrc && (
              <div className="space-y-3">
                <div
                  className="relative w-full rounded-lg overflow-hidden"
                  style={{ height: 280 }}
                >
                  <Cropper
                    image={customCropSrc}
                    crop={customCrop}
                    zoom={customZoom}
                    aspect={1}
                    cropShape="round"
                    onCropChange={setCustomCrop}
                    onZoomChange={setCustomZoom}
                    onCropComplete={(_, area) => setCustomCroppedArea(area)}
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
                    value={customZoom}
                    onChange={(e) => setCustomZoom(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomCropSrc(null)}
                  >
                    やり直す
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomCropConfirm}
                    disabled={customUploading}
                  >
                    {customUploading ? "アップロード中..." : "この画像を使う"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
