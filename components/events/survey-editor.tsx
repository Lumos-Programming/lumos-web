"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { surveyDefinitionSchema } from "@/lib/survey-form";
import {
  SURVEY_LIMITS,
  SURVEY_QUESTION_TYPES,
  SURVEY_QUESTION_TYPE_LABELS,
  type SurveyDefinition,
  type SurveyQuestion,
  type SurveyQuestionType,
} from "@/types/survey";

/** 編集中の質問。種類を切り替えても選択肢を捨てないよう、options は常に持つ */
interface DraftQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  required: boolean;
  options: string[];
  /**
   * options と同じ並びで、回答で選ばれているため変更・削除できないか。
   * 文言ではなく位置で持つので、新しい選択肢に同じ文言を打っても固定されない。
   */
  optionLocked: boolean[];
}

function toDraft(q: SurveyQuestion, used: string[] = []): DraftQuestion {
  const options = q.type === "choice" ? q.options : ["", ""];
  return {
    ...q,
    options,
    optionLocked: options.map((o) => q.type === "choice" && used.includes(o)),
  };
}

function fromDraft(d: DraftQuestion): SurveyQuestion {
  const base = { id: d.id, label: d.label, required: d.required };
  if (d.type === "choice")
    return { ...base, type: "choice", options: d.options };
  return { ...base, type: d.type };
}

function newQuestionId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

interface SurveyEditorProps {
  eventId: string;
  initialSurvey: SurveyDefinition | null;
  /** 回答がある質問の ID。削除・種類変更はできない */
  answeredQuestionIds: string[];
  /** 質問 ID → 回答で選ばれている選択肢。これらは削除・変更できない */
  usedOptions: Record<string, string[]>;
}

/** 運営がイベントのアンケートの質問を作る・直すフォーム */
export function SurveyEditor({
  eventId,
  initialSurvey,
  answeredQuestionIds,
  usedOptions,
}: SurveyEditorProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    () =>
      initialSurvey?.questions.map((q) => toDraft(q, usedOptions[q.id])) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const answered = new Set(answeredQuestionIds);
  const hasResponses = answered.size > 0;

  const patch = (index: number, change: Partial<DraftQuestion>) => {
    setSaved(false);
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...change } : q)),
    );
  };

  const move = (index: number, delta: number) => {
    setSaved(false);
    setQuestions((prev) => {
      const next = [...prev];
      const [q] = next.splice(index, 1);
      next.splice(index + delta, 0, q);
      return next;
    });
  };

  const addQuestion = () => {
    setSaved(false);
    setQuestions((prev) => [
      ...prev,
      {
        id: newQuestionId(),
        type: "choice",
        label: "",
        required: true,
        options: ["", ""],
        optionLocked: [false, false],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setSaved(false);
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const send = async (survey: SurveyDefinition | null) => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/survey`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "保存に失敗しました");
        return;
      }
      if (survey === null) setQuestions([]);
      setSaved(true);
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const parsed = surveyDefinitionSchema.safeParse({
      questions: questions.map(fromDraft),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    void send(parsed.data);
  };

  const handleRemoveSurvey = () => {
    if (!confirm("このイベントのアンケートを外しますか？")) return;
    void send(null);
  };

  return (
    <div className="space-y-4">
      {hasResponses && (
        <p className="text-sm text-muted-foreground">
          <Lock className="inline h-3.5 w-3.5 mr-1" />
          回答がある質問は、削除・種類の変更・選ばれている選択肢の削除ができません。質問文の修正や、質問・選択肢の追加はできます。
        </p>
      )}

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          まだ質問がありません。「質問を追加」から作成してください。
        </p>
      )}

      {questions.map((q, index) => {
        const locked = answered.has(q.id);
        return (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  質問 {index + 1}
                  {locked && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (回答あり)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="上へ"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="下へ"
                    disabled={index === questions.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="質問を削除"
                    className="text-destructive hover:text-destructive"
                    disabled={locked}
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`label-${q.id}`}>質問文</Label>
                <Input
                  id={`label-${q.id}`}
                  value={q.label}
                  maxLength={SURVEY_LIMITS.labelMax}
                  placeholder="例: 参加予定ですか？"
                  onChange={(e) => patch(index, { label: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="w-40">
                  <Select
                    value={q.type}
                    disabled={locked}
                    onValueChange={(v) =>
                      patch(index, { type: v as SurveyQuestionType })
                    }
                  >
                    <SelectTrigger aria-label="質問の種類">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SURVEY_QUESTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {SURVEY_QUESTION_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`required-${q.id}`}
                    checked={q.required}
                    onCheckedChange={(v) =>
                      patch(index, { required: v === true })
                    }
                  />
                  <Label htmlFor={`required-${q.id}`} className="font-normal">
                    必須
                  </Label>
                </div>
              </div>

              {q.type === "choice" && (
                <div className="space-y-2">
                  <Label>選択肢</Label>
                  {q.options.map((option, oi) => {
                    const optionLocked = q.optionLocked[oi] === true;
                    return (
                      <div key={oi} className="flex items-center gap-2">
                        <Input
                          value={option}
                          maxLength={SURVEY_LIMITS.optionMax}
                          disabled={optionLocked}
                          placeholder={`選択肢 ${oi + 1}`}
                          aria-label={`選択肢 ${oi + 1}`}
                          onChange={(e) =>
                            patch(index, {
                              options: q.options.map((o, j) =>
                                j === oi ? e.target.value : o,
                              ),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`選択肢 ${oi + 1} を削除`}
                          disabled={optionLocked || q.options.length <= 2}
                          onClick={() =>
                            patch(index, {
                              options: q.options.filter((_, j) => j !== oi),
                              optionLocked: q.optionLocked.filter(
                                (_, j) => j !== oi,
                              ),
                            })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={q.options.length >= SURVEY_LIMITS.maxOptions}
                    onClick={() =>
                      patch(index, {
                        options: [...q.options, ""],
                        optionLocked: [...q.optionLocked, false],
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    選択肢を追加
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button
        variant="outline"
        onClick={addQuestion}
        disabled={questions.length >= SURVEY_LIMITS.maxQuestions}
      >
        <Plus className="h-4 w-4" />
        質問を追加
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-muted-foreground">保存しました</p>}

      <div className="flex flex-wrap justify-end gap-2">
        {initialSurvey && (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={saving || hasResponses}
            onClick={handleRemoveSurvey}
          >
            アンケートを外す
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "質問を保存"}
        </Button>
      </div>
    </div>
  );
}
