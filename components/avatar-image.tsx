"use client";

import { useState } from "react";
import Image from "next/image";

/** プロフィール画像が読み込めないときの既定画像 */
export const DEFAULT_AVATAR_SRC = "/assets/lumos_logo-full.png";

/**
 * 表示する画像を決める。src が今の URL で失敗していれば fallbackSrc、
 * fallbackSrc も無ければ null（何も表示しない）。
 */
export function resolveAvatarSrc(
  src: string,
  failedSrc: string | null,
  fallbackSrc: string | undefined,
): string | null {
  if (src && failedSrc !== src) return src;
  return fallbackSrc ?? null;
}

/**
 * 外部サービス（LINE / Discord / GitHub など）のプロフィール画像。
 * 相手側で画像が変わると保存済みの URL が 404 になるため（#226）、
 * 読み込みに失敗したら既定画像に差し替える。
 */
export function AvatarImage({
  src,
  alt,
  className,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  className?: string;
  /** 失敗時に出す画像。省略すると何も表示しない（小さな補助アイコン向け） */
  fallbackSrc?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const shown = resolveAvatarSrc(src, failedSrc, fallbackSrc);
  if (!shown) return null;
  return (
    <Image
      src={shown}
      alt={alt}
      fill
      className={className}
      onError={shown === src ? () => setFailedSrc(src) : undefined}
    />
  );
}
