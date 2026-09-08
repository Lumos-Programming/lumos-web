"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewsPreviewDialog } from "@/components/news/news-preview-dialog";
import {
  NEWS_CATEGORIES,
  byPublishedAtDesc,
  type NewsArticle,
  type NewsCategory,
} from "@/types/news";

type NewsFormValues = {
  date: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  category: NewsCategory;
};

const EMPTY_FORM: NewsFormValues = {
  date: "",
  title: "",
  summary: "",
  body: "",
  image: "",
  category: "プロジェクト",
};

function toFormValues(article: NewsArticle): NewsFormValues {
  return {
    date: article.date,
    title: article.title,
    summary: article.summary,
    body: article.body,
    image: article.image,
    category: article.category,
  };
}

/** 今日を "2026年4月1日" 形式にする。日付欄の初期値に使う */
function todayLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

interface NewsManagerProps {
  /** サーバーで取得した全件 (下書きを含む)。以降の増減はこのコンポーネントが持つ */
  initialArticles: NewsArticle[];
}

export function NewsManager({ initialArticles }: NewsManagerProps) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (article: NewsArticle) => {
    setEditingId(article.id);
    setForm(toFormValues(article));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/news/image", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "画像のアップロードに失敗しました");
        return;
      }
      setForm((prev) => ({ ...prev, image: data.url }));
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setUploading(false);
      // 同じファイルを選び直せるように input をリセットする
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** 編集中の記事。新規作成中は undefined */
  const editingArticle = editingId
    ? articles.find((a) => a.id === editingId)
    : undefined;

  /**
   * フォームの内容を保存し、対象の記事 ID を返す。失敗したら null。
   * 新規なら作成、編集中なら更新。公開状態はここでは触らない。
   */
  const saveArticle = async (): Promise<string | null> => {
    const res = await fetch(
      editingId ? `/api/news/${editingId}` : "/api/news",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    // エラー時にサーバーが JSON を返さないことがあるので、パース失敗も握る
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "保存に失敗しました");
      return null;
    }

    if (editingId) {
      setArticles((prev) =>
        prev
          .map((a) => (a.id === editingId ? { ...a, ...form } : a))
          .sort(byPublishedAtDesc),
      );
      return editingId;
    }

    // 新規は必ず下書きとして作られる。publishedAt はまだ無いので一覧の末尾に入る
    const created: NewsArticle = {
      ...form,
      id: data.id,
      status: "draft",
      publishedAt: null,
      authorId: "",
      createdAt: null,
      updatedAt: null,
    };
    setArticles((prev) => [...prev, created].sort(byPublishedAtDesc));
    return data.id as string;
  };

  /** プレビューを開く。入力の不備はサーバーに送る前にここで気づけるようにする */
  const handleOpenPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim() || !form.date.trim()) {
      setError("タイトル・日付・本文を入力してください");
      return;
    }
    setError(null);
    setPreviewOpen(true);
  };

  /** プレビューから「下書きとして保存」 */
  const handleSaveDraft = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if ((await saveArticle()) === null) return;
      setPreviewOpen(false);
      cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * プレビューから「公開する」。
   * 保存してから公開する 2 段階なので、保存に失敗したら公開まで進めない。
   * すでに公開済みの記事を編集していた場合は、保存だけで公開状態は変わらない。
   */
  const handlePublishFromPreview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const id = await saveArticle();
      if (id === null) return;

      if (editingArticle?.status !== "published") {
        const res = await fetch(`/api/news/${id}/publish`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "保存はできましたが、公開に失敗しました");
          return;
        }
        setArticles((prev) =>
          prev
            .map((a) =>
              a.id === id
                ? {
                    ...a,
                    status: "published" as const,
                    // 初回公開の並び順を即座に反映する。正確な値は router.refresh() で追いつく
                    publishedAt: a.publishedAt ?? new Date().toISOString(),
                  }
                : a,
            )
            .sort(byPublishedAtDesc),
        );
      }

      setPreviewOpen(false);
      cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 下書きを公開する経路もプレビューを必ず通す。
   * 記事をフォームに読み込んでからプレビューを開くので、
   * 表示を見て気になったら「編集に戻る」でそのまま直せる。
   */
  const startPublishReview = (article: NewsArticle) => {
    startEdit(article);
    setPreviewOpen(true);
  };

  /** 公開中の記事を下書きに戻す */
  const handleUnpublish = async (article: NewsArticle) => {
    if (!confirm("このお知らせを下書きに戻しますか？公開ページから消えます")) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/news/${article.id}/publish`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "下書きに戻せませんでした");
        return;
      }
      setArticles((prev) =>
        prev.map((a) =>
          a.id === article.id ? { ...a, status: "draft" as const } : a,
        ),
      );
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお知らせを削除しますか？元に戻せません")) return;
    setError(null);
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "削除に失敗しました");
        return;
      }
      setArticles((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">お知らせ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだお知らせがありません。下のフォームから作成できます。
            </p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          article.status === "published"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {article.status === "published" ? "公開中" : "下書き"}
                      </span>
                      <p className="font-medium truncate">{article.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {article.date} ・ {article.category}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant={
                        article.status === "published" ? "outline" : "default"
                      }
                      size="sm"
                      onClick={() =>
                        article.status === "published"
                          ? handleUnpublish(article)
                          : startPublishReview(article)
                      }
                    >
                      {article.status === "published"
                        ? "下書きに戻す"
                        : "確認して公開"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(article)}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(article.id)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {editingId ? "お知らせを編集" : "お知らせを作成"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOpenPreview} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="news-title" className="text-sm font-medium">
                  タイトル
                </label>
                <Input
                  id="news-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="はじプロ最終発表会"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="news-date" className="text-sm font-medium">
                  日付
                </label>
                <div className="flex gap-2">
                  <Input
                    id="news-date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    placeholder="2026年4月1日"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm({ ...form, date: todayLabel() })}
                  >
                    今日
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  表示用の文字列です。「2026年4月中」のような書き方もできます
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="news-summary" className="text-sm font-medium">
                概要
              </label>
              <Input
                id="news-summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="一覧カードに出る短い説明"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">カテゴリ</label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm({ ...form, category: value as NewsCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEWS_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label htmlFor="news-image" className="text-sm font-medium">
                アイキャッチ画像
              </label>
              <div className="flex gap-2">
                <Input
                  id="news-image"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="画像をアップロードするか URL を貼り付け"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "アップロード中..." : "選択"}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              {form.image ? (
                // アップロード直後の GCS URL も確認できるよう、最適化なしの img で出す
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.image}
                  alt="アイキャッチのプレビュー"
                  className="mt-2 max-h-40 rounded border object-contain"
                />
              ) : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="news-body" className="text-sm font-medium">
                本文 (Markdown)
              </label>
              <Textarea
                id="news-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={12}
                placeholder={
                  "## 見出し\n\n本文を書きます。**強調** やリンクも使えます。"
                }
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                プレビュー
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  キャンセル
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              プレビューで表示を確認してから、公開または下書き保存を選べます
            </p>
          </form>
        </CardContent>
      </Card>

      <NewsPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        article={form}
        alreadyPublished={editingArticle?.status === "published"}
        submitting={submitting}
        error={error}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublishFromPreview}
      />
    </div>
  );
}
