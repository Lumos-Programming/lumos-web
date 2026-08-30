import { Badge, Button } from "./ui";
import Link from "next/link";
import {
  getRelativeWeekId,
  getWeekDateFromWeekId,
  formatWeekDate,
  formatWeekIsoLabel,
  getWeekLabel,
  getNextEventWeekId,
  isValidWeekId,
} from "@/lib/mini-lt/utils";
import { sendLineNextEvent } from "@/lib/mini-lt/actions/line";

interface WeekNavigatorProps {
  currentWeek: string;
  baseUrl: string;
  showSendButton?: boolean;
}

export function WeekNavigator({
  currentWeek,
  baseUrl,
  showSendButton = false,
}: WeekNavigatorProps) {
  const nextEventWeekId = getNextEventWeekId();
  // 不正な週IDを渡されても描画できるよう次回イベント週にフォールバックする
  const weekId = isValidWeekId(currentWeek) ? currentWeek : nextEventWeekId;

  const weekDate = getWeekDateFromWeekId(weekId);
  const prevWeek = getRelativeWeekId(-1, weekDate);
  const nextWeek = getRelativeWeekId(1, weekDate);

  // 未来方向はnext event weekまでに制限
  const canGoForward = nextWeek <= nextEventWeekId;

  const prevDate = formatWeekDate(prevWeek);
  const currentDate = formatWeekDate(weekId);
  const nextDate = formatWeekDate(nextWeek);
  // 前回/今回/次回/次々回に当てはまる週だけ相対ラベルを添える
  const relativeLabel = getWeekLabel(weekId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-3">
        <Link href={`${baseUrl}?week=${prevWeek}`}>
          <Button
            variant="outline"
            className="hover:bg-purple-50 flex flex-col items-start py-2 h-auto"
          >
            <span className="text-xs">← 前の週</span>
            <span className="text-xs font-normal opacity-70">{prevDate}</span>
          </Button>
        </Link>

        <div className="bg-gradient-primary px-6 flex flex-col py-2 rounded-md text-white items-center min-w-[160px]">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">📅 {currentDate}</span>
            {relativeLabel && (
              <Badge className="bg-white/25 border-transparent text-white text-[10px] px-1.5 py-0 shadow-none hover:bg-white/25">
                {relativeLabel}
              </Badge>
            )}
          </div>
          <span className="text-xs font-normal opacity-70">
            {formatWeekIsoLabel(weekId)}
          </span>
        </div>

        {canGoForward ? (
          <Link href={`${baseUrl}?week=${nextWeek}`}>
            <Button
              variant="outline"
              className="hover:bg-purple-50 flex flex-col items-end py-2 h-auto"
            >
              <span className="text-xs">次の週 →</span>
              <span className="text-xs font-normal opacity-70">{nextDate}</span>
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            className="flex flex-col items-end py-2 h-auto opacity-40 cursor-not-allowed"
            disabled
          >
            <span className="text-xs">次の週 →</span>
            <span className="text-xs font-normal opacity-70">{nextDate}</span>
          </Button>
        )}
      </div>
      {showSendButton && (
        <div className="flex justify-center">
          <form action={sendLineNextEvent}>
            <Button type="submit" variant="outline" className="text-green-600">
              📤 送信
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
