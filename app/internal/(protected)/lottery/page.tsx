import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLotteryStatus } from "@/lib/lottery";
import { getMemberInternal } from "@/lib/members";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIZE_TIERS } from "@/types/lottery";

export const dynamic = "force-dynamic";

const deadlineFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function LotteryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");
  const me = session.user.id;

  const status = await getLotteryStatus(me);
  const last = status.lastDraw;
  const winnerNames = new Map(
    await Promise.all(
      (last?.winners ?? []).map(
        async (w) =>
          [
            w.memberId,
            (await getMemberInternal(w.memberId))?.name ?? "—",
          ] as const,
      ),
    ),
  );
  const myResult = last?.winners.find((w) => w.memberId === me);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-spring-up space-y-6">
      <PageHeader
        title="週次宝くじ"
        description="lumos-web の Issue を閉じる PR がマージされると、Issue 1 件につきチケット 1 枚がもらえます。毎週金曜 17:00 に締め切り、17:30 に抽選します。"
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            今週の回（締切 {deadlineFormat.format(new Date(status.deadline))}）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-bold">
            {status.myTickets.length} 枚
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              （全体 {status.totalTickets} 枚）
            </span>
          </p>
          {status.myTickets.length > 0 && (
            <ul className="text-sm text-muted-foreground space-y-1">
              {status.myTickets.map((t) => (
                <li key={t.key}>
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold">
          前回の結果{last ? `（${last.drawId}）` : ""}
        </h2>
        {!last ? (
          <p className="text-sm text-muted-foreground">
            まだ抽選していません。
          </p>
        ) : last.participants === 0 ? (
          <p className="text-sm text-muted-foreground">
            参加者がいませんでした。
          </p>
        ) : (
          <>
            <p className="text-sm">
              {myResult
                ? `🎉 ${PRIZE_TIERS.find((t) => t.tier === myResult.tier)!.label}が当たりました！`
                : "今回は当たりませんでした。"}
            </p>
            <ul className="divide-y rounded-md border text-sm">
              {PRIZE_TIERS.map((tier) => {
                const names = last.winners
                  .filter((w) => w.tier === tier.tier)
                  .map((w) => winnerNames.get(w.memberId));
                return (
                  <li key={tier.tier} className="px-4 py-3">
                    <p className="font-semibold">
                      {tier.label}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {tier.prize}
                      </span>
                    </p>
                    <p>{names.length > 0 ? names.join("、") : "—"}</p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
