"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Article } from "@/types/article";

type ArticleFormValues = {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  platform: string;
};

const EMPTY_FORM: ArticleFormValues = {
  url: "",
  title: "",
  description: "",
  thumbnailUrl: "",
  publishedAt: "",
  platform: "",
};

function toFormValues(article: Article): ArticleFormValues {
  return {
    url: article.url,
    title: article.title,
    description: article.description ?? "",
    thumbnailUrl: article.thumbnailUrl ?? "",
    publishedAt: article.publishedAt,
    platform: article.platform ?? "",
  };
}

interface ArticleManagerProps {
  initialArticles: Article[];
}

export function ArticleManager({ initialArticles }: ArticleManagerProps) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (article: Article) => {
    setEditingId(article.id);
    setForm(toFormValues(article));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        editingId ? `/api/articles/${editingId}` : "/api/articles",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      if (editingId) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === editingId ? ({ ...a, ...form } as Article) : a,
          ),
        );
      } else {
        setArticles((prev) => [data as Article, ...prev]);
      }
      cancelEdit();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この記事を削除しますか？")) return;
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) cancelEdit();
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">登録済みの記事</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ記事が登録されていません。下のフォームから登録できます。
            </p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {article.url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {article.publishedAt}
                      {article.platform ? ` ・ ${article.platform}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
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
            {editingId ? "記事を編集" : "記事を登録"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">記事URL</label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://qiita.com/..."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明（任意）</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">公開日</label>
                <Input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) =>
                    setForm({ ...form, publishedAt: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">媒体（任意）</label>
                <Input
                  value={form.platform}
                  onChange={(e) =>
                    setForm({ ...form, platform: e.target.value })
                  }
                  placeholder="Qiita / Zenn / Medium など"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                サムネイル画像URL（任意）
              </label>
              <Input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) =>
                  setForm({ ...form, thumbnailUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : editingId ? "更新する" : "登録する"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  キャンセル
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
