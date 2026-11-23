"use client";

import { useState } from "react";
import Image from "next/image";

/** プロフィール画像が読み込めないときの既定画像 */
export const DEFAULT_AVATAR_SRC = "/assets/lumos_logo-full.png";

/**
 * 表示する画像を決める。今の src の読み込みに失敗していれば fallbackSrc、
 * fallbackSrc も無ければ null（何も表示しない）。
 */
export function resolveAvatarSrc(
  src: string,
  failed: boolean,
  fallbackSrc: string | undefined,
): string | null {
  if (src && !failed) return src;
  return fallbackSrc ?? null;
}

/**
 * 外部サービス（LINE / Discord / GitHub など）のプロフィール画像。
 * 相手側で画像が変わると保存済みの URL が 404 になるため（#226）、
 * 読み込みに失敗したら既定画像に差し替える。
 *
 * 画像は `wrapperClassName` の枠（div）の中に `fill` で敷き詰める。
 * fallbackSrc が無いときに失敗したら枠ごと消す（空の丸枠を残さない）。
 */
export function AvatarImage({
  src,
  alt,
  wrapperClassName,
  className,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  /** 枠の className。画像は fill なので `relative` か `absolute` を必ず含める */
  wrapperClassName: string;
  /** 画像の className */
  className?: string;
  /** 失敗時に出す画像。省略すると枠ごと何も表示しない（小さな補助アイコン向け） */
  fallbackSrc?: string;
}) {
  // 失敗状態は「どの src で失敗したか」とセットで持ち、src が変わったら
  // 描画中にリセットする。A で失敗 → B → A と戻ったときに A を読み込み直すため。
  const [state, setState] = useState({ src, failed: false });
  if (state.src !== src) setState({ src, failed: false });
  const failed = state.src === src && state.failed;

  const shown = resolveAvatarSrc(src, failed, fallbackSrc);
  if (!shown) return null;
  return (
    <div className={wrapperClassName}>
      <Image
        src={shown}
        alt={alt}
        fill
        className={className}
        onError={
          shown === src ? () => setState({ src, failed: true }) : undefined
        }
      />
    </div>
  );
}
