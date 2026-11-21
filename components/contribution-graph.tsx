import { cn } from "@/lib/utils";
import type { GithubContributions } from "@/types/github-contributions";

/** GitHub のプロフィールと同じ緑 5 段階 (ライト / ダーク) */
const LEVEL_CLASSES = [
  "bg-[#ebedf0] dark:bg-[#2d333b]",
  "bg-[#9be9a8] dark:bg-[#0e4429]",
  "bg-[#40c463] dark:bg-[#006d32]",
  "bg-[#30a14e] dark:bg-[#26a641]",
  "bg-[#216e39] dark:bg-[#39d353]",
] as const;

const WEEKDAY_OF = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function formatDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

interface ContributionGraphProps {
  contributions: GithubContributions;
  /** 直近何週分を出すか。省略すると 1 年分 */
  weeks?: number;
  /** 月ラベルを上に出す */
  showMonths?: boolean;
  className?: string;
}

/**
 * GitHub の草。日曜始まりの列 (= 週) を左から右に並べる。
 * 列幅は親に合わせて伸縮するので、タイルのような狭い場所には weeks で本数を絞って使う。
 */
export function ContributionGraph({
  contributions,
  weeks,
  showMonths = false,
  className,
}: ContributionGraphProps) {
  const { startDate, counts, levels } = contributions;

  // GitHub は取得期間の初日から返すので、最初の週は日曜から始まっていないことがある
  let offset = WEEKDAY_OF(startDate);
  let days = counts.map((count, i) => ({
    date: addDays(startDate, i),
    count,
    level: levels[i] ?? 0,
  }));

  if (weeks !== undefined) {
    // 末尾 weeks 週分だけ残す。切った先頭の曜日に合わせて offset を取り直す
    const total = offset + days.length;
    const keepFrom = Math.max(0, total - weeks * 7);
    days = days.slice(Math.max(0, keepFrom - offset));
    offset = days.length > 0 ? WEEKDAY_OF(days[0].date) : 0;
  }

  const columns = Math.ceil((offset + days.length) / 7);

  // 列 (週) ごとに、その列の最初の日の月を見て、前の列と変わったところにラベルを置く
  const monthLabels: { column: number; label: string }[] = [];
  if (showMonths) {
    const monthOfColumn = (c: number) =>
      days[Math.max(0, c * 7 - offset)]?.date.slice(0, 7) ?? "";
    for (let c = 0; c < columns; c++) {
      const month = monthOfColumn(c);
      if (c > 0 && month === monthOfColumn(c - 1)) continue;
      // 先頭の列が月末の端切れなら、次の列のラベルと重なるので出さない
      if (c === 0 && columns > 1 && month !== monthOfColumn(1)) continue;
      monthLabels.push({ column: c + 1, label: `${Number(month.slice(5))}月` });
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {showMonths && (
        <div
          className="grid text-[10px] leading-none text-muted-foreground mb-1"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {monthLabels.map(({ column, label }) => (
            <span
              key={column}
              className="whitespace-nowrap"
              style={{ gridColumn: column }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateRows: "repeat(7, minmax(0, 1fr))",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridAutoFlow: "column",
        }}
        role="img"
        aria-label={`GitHub コントリビューション ${contributions.total} 件`}
      >
        {days.map((day, i) => (
          <span
            key={day.date}
            title={`${formatDay(day.date)}: ${day.count} contributions`}
            className={cn(
              "aspect-square rounded-[2px]",
              LEVEL_CLASSES[day.level],
            )}
            style={i === 0 ? { gridRow: offset + 1 } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/** 「少 ▢▢▢▢▢ 多」の凡例 */
export function ContributionLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[10px] text-muted-foreground",
        className,
      )}
    >
      <span>少</span>
      {LEVEL_CLASSES.map((cls) => (
        <span key={cls} className={cn("h-2.5 w-2.5 rounded-[2px]", cls)} />
      ))}
      <span>多</span>
    </div>
  );
}
