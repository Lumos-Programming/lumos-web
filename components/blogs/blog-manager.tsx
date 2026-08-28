"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Blog } from "@/types/blog";

type BlogFormValues = {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  platform: string;
};

const EMPTY_FORM: BlogFormValues = {
  url: "",
  title: "",
  description: "",
  thumbnailUrl: "",
  publishedAt: "",
  platform: "",
};

function toFormValues(blog: Blog): BlogFormValues {
  return {
    url: blog.url,
    title: blog.title,
    description: blog.description ?? "",
    thumbnailUrl: blog.thumbnailUrl ?? "",
    publishedAt: blog.publishedAt,
    platform: blog.platform ?? "",
  };
}

interface BlogManagerProps {
  initialBlogs: Blog[];
}

export function BlogManager({ initialBlogs }: BlogManagerProps) {
  const router = useRouter();
  const [blogs, setBlogs] = useState(initialBlogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (blog: Blog) => {
    setEditingId(blog.id);
    setForm(toFormValues(blog));
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
        editingId ? `/api/blogs/${editingId}` : "/api/blogs",
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
        setBlogs((prev) =>
          prev.map((a) =>
            a.id === editingId ? ({ ...a, ...form } as Blog) : a,
          ),
        );
      } else {
        setBlogs((prev) => [data as Blog, ...prev]);
      }
      cancelEdit();
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この記事を削除しますか？")) return;
    setError(null);
    try {
      const res = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "削除に失敗しました");
        return;
      }
      setBlogs((prev) => prev.filter((a) => a.id !== id));
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
          <CardTitle className="text-base">登録済みの記事</CardTitle>
        </CardHeader>
        <CardContent>
          {blogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ記事が登録されていません。下のフォームから登録できます。
            </p>
          ) : (
            <div className="space-y-3">
              {blogs.map((blog) => (
                <div
                  key={blog.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{blog.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {blog.url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {blog.publishedAt}
                      {blog.platform ? ` ・ ${blog.platform}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(blog)}
                    >
                      編集
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(blog.id)}
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
