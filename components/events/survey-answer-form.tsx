"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateSurveyAnswers } from "@/lib/survey-form";
import {
  SURVEY_LIMITS,
  type SurveyAnswers,
  type SurveyQuestion,
} from "@/types/survey";

interface SurveyAnswerFormProps {
  eventId: string;
  questions: SurveyQuestion[];
  /** 前回の回答。未回答なら null */
  initialAnswers: SurveyAnswers | null;
  /** イベント開始後は回答を変えられない */
  closed: boolean;
}

const RATINGS = Array.from(
  { length: SURVEY_LIMITS.ratingMax - SURVEY_LIMITS.ratingMin + 1 },
  (_, i) => i + SURVEY_LIMITS.ratingMin,
);

/** メンバーがイベントのアンケートに回答・修正するフォーム */
export function SurveyAnswerForm({
  eventId,
  questions,
  initialAnswers,
  closed,
}: SurveyAnswerFormProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<SurveyAnswers>(
    () => initialAnswers ?? {},
  );
  const [answeredBefore, setAnsweredBefore] = useState(initialAnswers !== null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (id: string, value: number | string) => {
    setSaved(false);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 未回答 (自由記述の空欄を含む) は送らない
    const payload: SurveyAnswers = {};
    for (const q of questions) {
      const v = answers[q.id];
      if (v === undefined) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      payload[q.id] = v;
    }
    const missing = questions.find(
      (q) => q.required && payload[q.id] === undefined,
    );
    if (missing) {
      setError(`「${missing.label}」に回答してください`);
      return;
    }
    if (!validateSurveyAnswers(questions, payload)) {
      setError("回答の形式が正しくありません");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/survey/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "送信に失敗しました");
        return;
      }
      setAnsweredBefore(true);
      setSaved(true);
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {answeredBefore && (
        <p className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          回答済み{closed ? "" : " (イベント開始まで修正できます)"}
        </p>
      )}
      {closed && (
        <p className="text-sm text-muted-foreground">
          イベントが始まったため、回答の受付は終了しました。
        </p>
      )}

      <fieldset disabled={closed || submitting} className="space-y-4">
        {questions.map((q, index) => (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium">
                {index + 1}. {q.label}
                {q.required ? (
                  <span className="ml-1 text-destructive">*</span>
                ) : (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (任意)
                  </span>
                )}
              </p>

              {q.type === "rating" && (
                <RadioGroup
                  className="flex flex-wrap gap-4"
                  value={
                    answers[q.id] === undefined ? "" : String(answers[q.id])
                  }
                  onValueChange={(v) => set(q.id, Number(v))}
                  aria-label={q.label}
                >
                  {RATINGS.map((r) => (
                    <div key={r} className="flex items-center gap-1.5">
                      <RadioGroupItem value={String(r)} id={`${q.id}-${r}`} />
                      <Label htmlFor={`${q.id}-${r}`} className="font-normal">
                        {r}
                      </Label>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground self-center">
                    (1: 低い 〜 5: 高い)
                  </span>
                </RadioGroup>
              )}

              {q.type === "choice" && (
                <RadioGroup
                  value={(answers[q.id] as string | undefined) ?? ""}
                  onValueChange={(v) => set(q.id, v)}
                  aria-label={q.label}
                >
                  {q.options.map((option, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <RadioGroupItem value={option} id={`${q.id}-${oi}`} />
                      <Label htmlFor={`${q.id}-${oi}`} className="font-normal">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.type === "text" && (
                <Textarea
                  value={(answers[q.id] as string | undefined) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                  maxLength={SURVEY_LIMITS.textAnswerMax}
                  rows={3}
                  aria-label={q.label}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-muted-foreground">送信しました</p>}

      {!closed && (
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "送信中..."
              : answeredBefore
                ? "回答を更新する"
                : "回答する"}
          </Button>
        </div>
      )}
    </form>
  );
}
