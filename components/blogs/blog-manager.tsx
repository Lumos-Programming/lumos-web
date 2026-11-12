"use client";

import { useReducer, useRef, useState } from "react";
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
import {
  BLOG_PLATFORM_OTHER,
  BLOG_PLATFORM_PRESETS,
  byPublishedAtDesc,
  toPlatformSelection,
  type Blog,
} from "@/types/blog";
import { supportsMetadataAutofill } from "@/lib/blog-url";
import {
  autofillReducer,
  initialAutofillState,
  shouldFetchOnBlur,
} from "@/lib/blog-autofill";

type BlogFormValues = {
  url: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  /** プリセットのいずれか、または「その他」。未選択は空文字 */
  platformPreset: string;
  /** 「その他」を選んだときだけ使う自由記述 */
  platformOther: string;
};

/** フォームの 2 つの入力から、保存する platform の値を決める */
function resolvePlatform(form: BlogFormValues): string {
  return form.platformPreset === BLOG_PLATFORM_OTHER
    ? form.platformOther.trim()
    : form.platformPreset;
}

/** API に送る形。platform は 1 つの文字列に畳む */
function toPayload(form: BlogFormValues) {
  const { platformPreset: _p, platformOther: _o, ...rest } = form;
  return { ...rest, platform: resolvePlatform(form) };
}

const EMPTY_FORM: BlogFormValues = {
  url: "",
  title: "",
  description: "",
  thumbnailUrl: "",
  publishedAt: "",
  platformPreset: "",
  platformOther: "",
};

function toFormValues(blog: Blog): BlogFormValues {
  // 保存済みの値がプリセットに無ければ「その他」+ 自由記述として復元する
  const { preset, other } = toPlatformSelection(blog.platform);
  return {
    url: blog.url,
    title: blog.title,
    description: blog.description ?? "",
    thumbnailUrl: blog.thumbnailUrl ?? "",
    publishedAt: blog.publishedAt,
    platformPreset: preset,
    platformOther: other,
  };
}

interface BlogManagerProps {
  /** サーバーで取得した自分の記事。以降の増減はこのコンポーネントが持つ */
  myBlogs: Blog[];
}

export function BlogManager({ myBlogs }: BlogManagerProps) {
  const router = useRouter();
  const [blogs, setBlogs] = useState(myBlogs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** フォームの値と、記事情報の自動取得の状態 (どの欄に自動で入れたか・取得中か) */
  const [autofillState, dispatch] = useReducer(
    autofillReducer<BlogFormValues>,
    EMPTY_FORM,
    initialAutofillState,
  );
  const { form, status: autofillStatus } = autofillState;
  /** 取得ごとに振る番号。途中で URL が変わったときに古い結果を見分けるのに使う */
  const requestCounter = useRef(0);
  const setFields = (fields: Partial<Omit<BlogFormValues, "url">>) =>
    dispatch({ type: "fieldsChanged", fields });

  /**
   * 記事URLからタイトル・説明・公開日・媒体・サムネイル画像URLを取得して欄に入れる。
   * overwrite が false のときは空欄にだけ入れる (手で入れた値を消さない)。
   */
  const autofill = async (overwrite: boolean) => {
    if (!supportsMetadataAutofill(form.url)) return;
    const requestId = ++requestCounter.current;
    dispatch({ type: "fetchStarted", requestId });
    let metadata: unknown = null;
    try {
      const res = await fetch("/api/blogs/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) metadata = data?.metadata ?? null;
    } catch {
      // 通信に失敗しても、ドメインで決まる媒体だけは入れる
    }
    dispatch({ type: "fetchFinished", requestId, metadata, overwrite });
  };

  const startEdit = (blog: Blog) => {
    setEditingId(blog.id);
    dispatch({ type: "reset", form: toFormValues(blog) });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    dispatch({ type: "reset", form: EMPTY_FORM });
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
          body: JSON.stringify(toPayload(form)),
        },
      );
      // エラー時にサーバーが JSON を返さないことがあるので、パース失敗も握る
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "保存に失敗しました");
        return;
      }
      // 公開日が変わる/古い記事が増えるので、どちらも並べ直す
      if (editingId) {
        setBlogs((prev) =>
          prev
            .map((a) =>
              a.id === editingId ? ({ ...a, ...toPayload(form) } as Blog) : a,
            )
            .sort(byPublishedAtDesc),
        );
      } else {
        setBlogs((prev) => [data as Blog, ...prev].sort(byPublishedAtDesc));
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
                onChange={(e) =>
                  dispatch({ type: "urlChanged", url: e.target.value })
                }
                onBlur={() => {
                  if (shouldFetchOnBlur(autofillState)) autofill(false);
                }}
                placeholder="https://qiita.com/..."
                required
              />
              {supportsMetadataAutofill(form.url) && (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={autofillStatus === "loading"}
                    // 記事URLの欄からフォーカスを移さない。blur で取得が始まると
                    // ボタンが disabled になり、このクリックが届かなくなるため
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => autofill(true)}
                  >
                    記事の情報を取り直す
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {autofillStatus === "loading"
                      ? "記事の情報を取得しています..."
                      : autofillStatus === "notFound"
                        ? "自動で取得できませんでした。各項目を手動で入力してください"
                        : "タイトルなどを記事から自動で入力します。入力後に書き換えられます"}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={form.title}
                onChange={(e) => setFields({ title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">説明（任意）</label>
              <Textarea
                value={form.description}
                onChange={(e) => setFields({ description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">公開日</label>
                <Input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setFields({ publishedAt: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">媒体（任意）</label>
                <Select
                  value={form.platformPreset}
                  onValueChange={(v) =>
                    setFields({
                      platformPreset: v,
                      // 「その他」以外に切り替えたら自由記述は捨てる
                      platformOther:
                        v === BLOG_PLATFORM_OTHER ? form.platformOther : "",
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOG_PLATFORM_PRESETS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                    <SelectItem value={BLOG_PLATFORM_OTHER}>
                      {BLOG_PLATFORM_OTHER}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.platformPreset === BLOG_PLATFORM_OTHER && (
                  <Input
                    value={form.platformOther}
                    onChange={(e) =>
                      setFields({ platformOther: e.target.value })
                    }
                    placeholder="媒体名を入力（例: はてなブログ）"
                    aria-label="媒体名"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                サムネイル画像URL（任意）
              </label>
              <Input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setFields({ thumbnailUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              {/* 取得中に保存すると、届いた値がフォームのリセット後に捨てられる */}
              <Button
                type="submit"
                disabled={submitting || autofillStatus === "loading"}
              >
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
