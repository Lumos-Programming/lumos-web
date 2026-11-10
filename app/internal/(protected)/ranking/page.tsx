import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRankingPageData } from "@/lib/ranking";
import { getMembersInternal } from "@/lib/members";
import { formatMonthLabel } from "@/lib/events-format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RANKING_PRIZE_NOTE,
  RANKING_TOP_N,
  type RankingEntry,
} from "@/types/ranking";

export const dynamic = "force-dynamic";

function RankingList({
  entries,
  names,
  me,
}: {
  entries: RankingEntry[];
  names: Map<string, string>;
  me: string;
}) {
  return (
    <ol className="divide-y rounded-md border text-sm">
      {entries.map((e) => {
        const mine = e.memberId === me;
        return (
          <li
            key={e.memberId}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              mine && "bg-primary/10 font-semibold",
            )}
            aria-current={mine ? "true" : undefined}
          >
            <span className="w-10 shrink-0 tabular-nums">
              {e.rank <= RANKING_TOP_N ? "🏆 " : ""}
              {e.rank}位
            </span>
            <span className="flex-1 truncate">
              {names.get(e.memberId) ?? "—"}
              {mine && (
                <span className="ml-2 text-xs text-muted-foreground">
                  （あなた）
                </span>
              )}
            </span>
            <span className="tabular-nums">{e.points} pt</span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function RankingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");
  const me = session.user.id;

  const [data, members] = await Promise.all([
    getRankingPageData(),
    getMembersInternal(),
  ]);
  const names = new Map(members.map((m) => [m.id, m.name]));
  const myEntry = data.current.find((e) => e.memberId === me);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-spring-up space-y-6">
      <PageHeader
        title="月間ランキング"
        description={`日本時間の月ごとのポイント合計で順位を付けます。毎月 1 日に前月の上位 ${RANKING_TOP_N} 位までを確定して表彰します（同点は同順位で、${RANKING_TOP_N} 位と同点の人も全員表彰）。${RANKING_PRIZE_NOTE}。`}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {formatMonthLabel(data.month)}のあなたの順位
          </CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">
          {myEntry ? (
            <>
              {myEntry.rank}位
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                （{myEntry.points} pt / {data.current.length} 人中）
              </span>
            </>
          ) : (
            <span className="text-base font-normal text-muted-foreground">
              今月はまだポイントがありません。
            </span>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold">
          {formatMonthLabel(data.month)}のランキング（集計中）
        </h2>
        {data.current.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            今月はまだ誰もポイントを獲得していません。
          </p>
        ) : (
          <RankingList entries={data.current} names={names} me={me} />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">
          {formatMonthLabel(data.lastMonth)}の表彰
        </h2>
        {!data.lastRanking ? (
          <p className="text-sm text-muted-foreground">
            まだ確定していません。
          </p>
        ) : data.lastRanking.honorees.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ポイントを獲得したメンバーがいませんでした。
          </p>
        ) : (
          <RankingList
            entries={data.lastRanking.honorees}
            names={names}
            me={me}
          />
        )}
      </section>
    </div>
  );
}
