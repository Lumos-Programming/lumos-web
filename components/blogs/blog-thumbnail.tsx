"use client";

import { useState } from "react";
import Image from "next/image";

/** 既定表示にするか。画像が無い、または今の URL の読み込みに失敗したとき */
export function shouldShowFallback(
  src: string | undefined,
  failedSrc: string | null,
): boolean {
  return !src || failedSrc === src;
}

/**
 * ブログカードのサムネイル。画像が無いときと、画像の URL が読み込めなくなったときは
 * 記事タイトル入りの既定表示にする（#309）。
 */
export function BlogThumbnail({ src, title }: { src?: string; title: string }) {
  // 失敗した URL を覚えておき、src が変わったら改めて読み込む
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || shouldShowFallback(src, failedSrc)) {
    return (
      <div
        data-testid="blog-thumbnail-fallback"
        className="absolute inset-0 flex items-center justify-center bg-gradient-primary p-6"
      >
        <p className="line-clamp-3 text-center text-lg font-bold text-white">
          {title}
        </p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      className="object-cover"
      onError={() => setFailedSrc(src)}
    />
  );
}
