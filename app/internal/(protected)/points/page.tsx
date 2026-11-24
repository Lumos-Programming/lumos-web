import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPointSummary } from "@/lib/points";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POINT_REASON_LABELS, POINT_RULES } from "@/types/points";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PointsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const { total, thisMonth, history } = await getPointSummary(session.user.id);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-spring-up space-y-6">
      <PageHeader
        title="ポイント"
        description="lumos-web へのコントリビューション・記事の登録・イベントへの出席でポイントが貯まります。"
      />

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              今月
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {thisMonth} pt
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              累計
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{total} pt</CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">履歴</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだポイントはありません。
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {history.map((t) => (
              <li key={t.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{POINT_REASON_LABELS[t.reason]}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.sourceUrl ? (
                      <a
                        href={t.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {t.description}
                      </a>
                    ) : (
                      t.description
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {dateFormat.format(new Date(t.createdAt))}
                </span>
                <span className="font-semibold whitespace-nowrap">
                  +{t.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">ポイントの付き方</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          {(Object.keys(POINT_RULES) as (keyof typeof POINT_RULES)[]).map(
            (reason) => (
              <li key={reason}>
                {POINT_REASON_LABELS[reason]}: {POINT_RULES[reason]} pt
              </li>
            ),
          )}
        </ul>
        <p className="text-xs text-muted-foreground">
          GitHub のポイントは、設定画面で GitHub
          アカウントを連携している場合のみ付きます。
        </p>
      </section>
    </div>
  );
}
