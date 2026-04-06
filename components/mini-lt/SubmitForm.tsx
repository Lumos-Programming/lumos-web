"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./ui";
import { SerializableTalk } from "@/lib/mini-lt/firebase";

interface SubmitFormProps {
  weekId: string;
  onSubmit: (data: {
    title: string;
    description: string;
    duration: number;
    id?: string;
  }) => Promise<void>;
  editingTalk?: SerializableTalk | null;
  onCancelEdit?: () => void;
}

const DURATION_OPTIONS = [1, 3, 5, 7, 10, 15] as const;

export function SubmitForm({
  onSubmit,
  editingTalk,
  onCancelEdit,
}: SubmitFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(5); // Default 5 minutes
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingTalk) {
      setTitle(editingTalk.title);
      setDescription(editingTalk.description);
      setDuration(editingTalk.duration);
    } else {
      setTitle("");
      setDescription("");
      setDuration(5); // Reset to default
    }
  }, [editingTalk]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ title, description, duration, id: editingTalk?.id });
      if (!editingTalk) {
        setTitle("");
        setDescription("");
        setDuration(5);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-purple-100 shadow-xl">
      <CardHeader className="bg-gradient-card border-b py-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          {editingTalk ? (
            <>
              <span className="text-2xl">✏️</span>
              <span>発表を編集</span>
            </>
          ) : (
            <>
              <span className="text-2xl">📝</span>
              <span>新しく発表を登録</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <span className="text-purple-600">📌</span>
              タイトル
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: VSCodeの便利な拡張機能を見つけた話"
              required
              className="border-2 focus:border-purple-300"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <span className="text-purple-600">⏱️</span>
              発表時間
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    duration === minutes
                      ? "bg-purple-600 text-white shadow-md scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {minutes}分
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <span className="text-purple-600">📄</span>
              概要（Markdown使えます!!）
              <a
                href="https://qiita.com/kamorits/items/6f342da395ad57468ae3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <span>🔰</span>
                <span>書き方</span>
              </a>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`発表の内容を詳しく記載してください

例:
- この拡張機能がすごく便利だった
- 作業効率が上がった具体例
- みんなにもおすすめしたい`}
              rows={6}
              required
              className="border-2 focus:border-purple-300"
            />
            <p className="text-xs text-muted-foreground">
              💡 Markdownで箇条書きや見出しが使えます（
              <a
                href="https://qiita.com/kamorits/items/6f342da395ad57468ae3"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                使い方
              </a>
              ）
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-primary hover:shadow-lg transition-all py-5 font-semibold"
            >
              {loading
                ? "保存中..."
                : editingTalk
                  ? "✅ 更新する"
                  : "🚀 登録する"}
            </Button>
            {editingTalk && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancelEdit}
                className="px-6 hover:bg-gray-100"
              >
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
