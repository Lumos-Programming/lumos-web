"use client";

import { Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { blogSharePath, buildXShareUrl } from "@/types/blog";

/**
 * 共有 URL (ブログ一覧で該当カードを強調する URL) の絶対 URL。
 * 本番・開発どちらでも今開いているサイトの URL にしたいので、
 * 環境変数ではなくブラウザの origin から組み立てる
 */
function toAbsoluteShareUrl(id: string): string {
  return new URL(blogSharePath(id), window.location.origin).toString();
}

async function copyBlogUrl(id: string): Promise<void> {
  try {
    // http で開いたページ (localhost 以外) では navigator.clipboard 自体が無い
    await navigator.clipboard.writeText(toAbsoluteShareUrl(id));
    toast({ title: "URLをコピーしました" });
  } catch {
    toast({ title: "URLをコピーできませんでした", variant: "destructive" });
  }
}

type ButtonSize = "sm" | "default";

interface CopyBlogLinkButtonProps {
  blogId: string;
  size?: ButtonSize;
  label?: string;
}

export function CopyBlogLinkButton({
  blogId,
  size = "default",
  label = "URLをコピー",
}: CopyBlogLinkButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={() => copyBlogUrl(blogId)}
    >
      <Link2 className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

interface BlogShareButtonsProps {
  blogId: string;
  title: string;
  size?: ButtonSize;
}

export function BlogShareButtons({
  blogId,
  title,
  size = "default",
}: BlogShareButtonsProps) {
  const shareToX = () => {
    window.open(
      buildXShareUrl(title, toAbsoluteShareUrl(blogId)),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <>
      <CopyBlogLinkButton blogId={blogId} size={size} />
      <Button type="button" variant="outline" size={size} onClick={shareToX}>
        <Share2 className="mr-2 h-4 w-4" />
        Xで共有
      </Button>
    </>
  );
}
