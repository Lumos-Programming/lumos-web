import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SURVEY_LIMITS,
  SURVEY_QUESTION_TYPE_LABELS,
  type SurveyQuestionSummary,
} from "@/types/survey";

interface SurveyResultsProps {
  summary: SurveyQuestionSummary[];
  responseCount: number;
  /** memberId → 表示名 (運営向けなので本名を含む) */
  names: Record<string, string>;
}

function Bar({ count, total }: { count: number; total: number }) {
  const ratio = total === 0 ? 0 : count / total;
  return (
    <div className="h-2 w-full rounded bg-muted">
      <div
        className="h-2 rounded bg-purple-500"
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </div>
  );
}

/** 質問ごとの集計表 (運営のみ) */
export function SurveyResults({
  summary,
  responseCount,
  names,
}: SurveyResultsProps) {
  if (responseCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">まだ回答はありません。</p>
    );
  }

  return (
    <div className="space-y-4">
      {summary.map((s, index) => (
        <Card key={s.question.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {index + 1}. {s.question.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {SURVEY_QUESTION_TYPE_LABELS[s.question.type]}・回答{" "}
              {s.answeredCount} / {responseCount} 人
              {s.question.type === "rating" && "average" in s && (
                <>・平均 {s.average === null ? "-" : s.average.toFixed(2)}</>
              )}
            </p>
          </CardHeader>
          <CardContent>
            {"counts" in s ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {s.question.type === "rating" ? "評価" : "選択肢"}
                    </TableHead>
                    <TableHead className="w-20 text-right">人数</TableHead>
                    <TableHead className="w-1/3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.counts.map((count, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {s.question.type === "choice"
                          ? s.question.options[i]
                          : i + SURVEY_LIMITS.ratingMin}
                      </TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                      <TableCell>
                        <Bar count={count} total={s.answeredCount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : s.answers.length === 0 ? (
              <p className="text-sm text-muted-foreground">回答なし</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">回答者</TableHead>
                    <TableHead>回答</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.answers.map((a) => (
                    <TableRow key={a.memberId}>
                      <TableCell className="align-top">
                        {names[a.memberId] ?? a.memberId}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap break-words">
                        {a.text}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
