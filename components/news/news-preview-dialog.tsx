"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  NewsArticleBody,
  NewsArticleHeader,
  type NewsArticleViewModel,
} from "@/components/news/news-article-view";

interface NewsPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** フォームの現在の入力値。保存前の内容をそのまま描画する */
  article: NewsArticleViewModel;
  /** 編集中の記事がすでに公開済みなら、公開ボタンではなく保存だけを出す */
  alreadyPublished: boolean;
  submitting: boolean;
  error: string | null;
  onSaveDraft: () => void;
  onPublish: () => void;
}

/**
 * 公開前に、公開ページと同じ見た目で本文を確認するためのモーダル。
 *
 * ページ遷移にすると未保存の内容を渡すために一度保存が必要になり、
 * 「まず下書き保存」に逆戻りしてしまう。タブだとフォームの幅で描画されるので
 * 実際の記事幅 (max-w-3xl) での崩れが見つけられない。
 */
export function NewsPreviewDialog({
  open,
  onOpenChange,
  article,
  alreadyPublished,
  submitting,
  error,
  onSaveDraft,
  onPublish,
}: NewsPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>プレビュー</DialogTitle>
          <DialogDescription>
            公開ページと同じ表示です。Markdownの崩れがないか確認してください。
          </DialogDescription>
        </DialogHeader>

        {/* 公開ページと同じ配色・幅で描画する */}
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-primary text-white px-4 py-8 md:px-6 md:py-10">
            <NewsArticleHeader article={article} />
          </div>
          <div className="px-4 py-8 md:px-6 md:py-10">
            <div className="max-w-3xl mx-auto">
              <NewsArticleBody article={article} />
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            編集に戻る
          </Button>
          <div className="flex gap-2">
            {alreadyPublished ? null : (
              <Button
                type="button"
                variant="outline"
                onClick={onSaveDraft}
                disabled={submitting}
              >
                下書きとして保存
              </Button>
            )}
            <Button type="button" onClick={onPublish} disabled={submitting}>
              {submitting
                ? "処理中..."
                : alreadyPublished
                  ? "変更を保存"
                  : "公開する"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
