import { Button } from './ui'
import Link from 'next/link'
import { getNavigationWeeks, formatWeekDate } from '@/lib/utils'
import { sendLineNextEvent } from '@/lib/actions/line'

interface WeekNavigatorProps {
  currentWeek: string
  baseUrl: string
  showSendButton?: boolean
}

export function WeekNavigator({ currentWeek, baseUrl, showSendButton = false }: WeekNavigatorProps) {
  // Get navigation weeks and labels
  const { prevWeek, centerWeek, nextWeek, centerLabel, rightLabel } = getNavigationWeeks()

  const prevDate = formatWeekDate(prevWeek)
  const centerDate = formatWeekDate(centerWeek)
  const nextDate = formatWeekDate(nextWeek)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-3">
        <Link href={`${baseUrl}?week=${prevWeek}`}>
          <Button
            variant={currentWeek === prevWeek ? 'default' : 'outline'}
            className={
              currentWeek === prevWeek
                ? 'bg-gradient-primary flex flex-col items-start py-2 h-auto'
                : 'hover:bg-purple-50 flex flex-col items-start py-2 h-auto'
            }
          >
            <span className="text-xs">← 前回</span>
            <span className="text-xs font-normal opacity-70">{prevDate}</span>
          </Button>
        </Link>
        <Link href={`${baseUrl}?week=${centerWeek}`}>
          <Button
            variant={currentWeek === centerWeek ? 'default' : 'outline'}
            className={
              currentWeek === centerWeek
                ? 'bg-gradient-primary px-6 flex flex-col py-2 h-auto'
                : 'hover:bg-purple-50 px-6 flex flex-col py-2 h-auto'
            }
          >
            <span className="text-sm">📅 {centerLabel}</span>
            <span className="text-xs font-normal opacity-70">{centerDate}</span>
          </Button>
        </Link>
        <Link href={`${baseUrl}?week=${nextWeek}`}>
          <Button
            variant={currentWeek === nextWeek ? 'default' : 'outline'}
            className={
              currentWeek === nextWeek
                ? 'bg-gradient-primary flex flex-col items-end py-2 h-auto'
                : 'hover:bg-purple-50 flex flex-col items-end py-2 h-auto'
            }
          >
            <span className="text-xs">{rightLabel} →</span>
            <span className="text-xs font-normal opacity-70">{nextDate}</span>
          </Button>
        </Link>
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
  )
}
