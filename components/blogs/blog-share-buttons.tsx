"use client";

import { Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { blogDetailPath, buildXShareUrl } from "@/types/blog";

/**
 * 個別ページの絶対 URL。本番・開発どちらでも今開いているサイトの URL にしたいので、
 * 環境変数ではなくブラウザの origin から組み立てる
 */
function toAbsoluteBlogUrl(id: string): string {
  return new URL(blogDetailPath(id), window.location.origin).toString();
}

async function copyBlogUrl(id: string): Promise<void> {
  try {
    // http で開いたページ (localhost 以外) では navigator.clipboard 自体が無い
    await navigator.clipboard.writeText(toAbsoluteBlogUrl(id));
    toast({ title: "URLをコピーしました" });
  } catch {
    toast({ title: "URLをコピーできませんでした", variant: "destructive" });
  }
}

interface CopyBlogLinkButtonProps {
  blogId: string;
  size?: "sm" | "default";
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
}

export function BlogShareButtons({ blogId, title }: BlogShareButtonsProps) {
  const shareToX = () => {
    window.open(
      buildXShareUrl(title, toAbsoluteBlogUrl(blogId)),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <CopyBlogLinkButton blogId={blogId} />
      <Button type="button" variant="outline" onClick={shareToX}>
        <Share2 className="mr-2 h-4 w-4" />
        Xで共有
      </Button>
    </div>
  );
}
