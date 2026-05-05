import { Button } from "./ui";
import Link from "next/link";
import {
  getRelativeWeekId,
  getWeekDateFromWeekId,
  formatWeekDate,
  getWeekLabel,
  getNextEventWeekId,
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
  const currentWeekDate = getWeekDateFromWeekId(currentWeek);
  const prevWeek = getRelativeWeekId(-1, currentWeekDate);
  const nextWeek = getRelativeWeekId(1, currentWeekDate);

  // 未来方向はnext event weekまでに制限
  const nextEventWeekId = getNextEventWeekId();
  const canGoForward = nextWeek <= nextEventWeekId;

  const prevDate = formatWeekDate(prevWeek);
  const currentDate = formatWeekDate(currentWeek);
  const nextDate = formatWeekDate(nextWeek);
  const currentLabel = getWeekLabel(currentWeek);

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

        <div className="bg-gradient-primary px-6 flex flex-col py-2 rounded-md text-white items-center min-w-[100px]">
          <span className="text-sm">📅 {currentLabel}</span>
          <span className="text-xs font-normal opacity-70">{currentDate}</span>
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
