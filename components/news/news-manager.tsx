"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const [showPreview, setShowPreview] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
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
        return;
      }
      if (editingId) {
        setArticles((prev) =>
          prev
            .map((a) => (a.id === editingId ? { ...a, ...form } : a))
            .sort(byPublishedAtDesc),
        );
      } else {
        // 新規は必ず下書き。publishedAt はまだ無いので一覧の末尾に入る
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
      }
      cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    const publishing = article.status === "draft";
    if (
      !publishing &&
      !confirm("このお知らせを下書きに戻しますか？公開ページから消えます")
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/news/${article.id}/publish`, {
        method: publishing ? "POST" : "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error ??
            (publishing ? "公開に失敗しました" : "下書きに戻せませんでした"),
        );
        return;
      }
      setArticles((prev) =>
        prev
          .map((a) =>
            a.id === article.id
              ? {
                  ...a,
                  status: publishing
                    ? ("published" as const)
                    : ("draft" as const),
                  // 初回公開の並び順を即座に反映する。サーバー側の値は router.refresh() で追いつく
                  publishedAt: a.publishedAt ?? new Date().toISOString(),
                }
              : a,
          )
          .sort(byPublishedAtDesc),
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
                      onClick={() => handleTogglePublish(article)}
                    >
                      {article.status === "published" ? "下書きに戻す" : "公開"}
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <label htmlFor="news-body" className="text-sm font-medium">
                  本文 (Markdown)
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview((prev) => !prev)}
                >
                  {showPreview ? "編集に戻る" : "プレビュー"}
                </Button>
              </div>
              {showPreview ? (
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4 min-h-[12rem]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {form.body || "_本文がまだ空です_"}
                  </ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  id="news-body"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={12}
                  placeholder={
                    "## 見出し\n\n本文を書きます。**強調** やリンクも使えます。"
                  }
                />
              )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "保存中..."
                  : editingId
                    ? "変更を保存"
                    : "下書きとして保存"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  キャンセル
                </Button>
              ) : null}
            </div>
            {editingId ? null : (
              <p className="text-xs text-muted-foreground">
                作成したお知らせは下書きになります。上の一覧から「公開」を押すと公開ページに出ます
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
