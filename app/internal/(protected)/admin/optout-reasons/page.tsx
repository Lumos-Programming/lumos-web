import { isAdmin } from "@/lib/auth";
import { countReasons, listOptoutSurveys } from "@/lib/optout-survey-report";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MessageSquareText } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function AdminOptoutReasonsPage() {
  // layout でも確認しているが、回答は個人の意見なのでページでも確かめる
  if (!(await isAdmin())) return null;

  let rows;
  let error: string | null = null;
  try {
    rows = await listOptoutSurveys();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="container max-w-5xl py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquareText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">退会理由</h1>
        {rows && (
          <span className="text-sm text-muted-foreground">
            全 {rows.length} 件
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        「継続しない /
        退会する」の手続きで回答された理由です。「未確定」は、理由を回答したあと
        Discord DM での最終確認を終えていない人です（退会は完了していません）。
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>回答の取得に失敗しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">理由ごとの件数</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">理由</th>
                    <th className="py-2 font-medium text-right">退会確定</th>
                    <th className="py-2 font-medium text-right">未確定</th>
                  </tr>
                </thead>
                <tbody>
                  {countReasons(rows!).map((c) => (
                    <tr key={c.reason} className="border-b last:border-0">
                      <td className="py-2">{c.label}</td>
                      <td className="py-2 text-right tabular-nums">
                        {c.confirmed}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {c.unconfirmed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">個別の回答</CardTitle>
            </CardHeader>
            <CardContent>
              {rows!.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  まだ回答はありません。
                </p>
              ) : (
                <ul className="divide-y">
                  {rows!.map((row) => (
                    <li key={row.discordId} className="py-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted-foreground">
                          {row.answeredAt
                            ? dateFormatter.format(row.answeredAt)
                            : "日時不明"}
                        </span>
                        <span
                          className={
                            row.confirmed
                              ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                              : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          }
                        >
                          {row.confirmed ? "退会確定" : "未確定"}
                        </span>
                      </div>
                      <p className="text-sm">{row.reasonLabel}</p>
                      {row.reasonDetail && (
                        <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                          {row.reasonDetail}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
