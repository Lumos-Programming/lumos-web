'use server'

/**
 * Server Actions for Discord Event Management
 */

import { revalidatePath } from 'next/cache'
import { getWeekData, saveDiscordEvent, removeDiscordEvent } from '@/lib/firebase'
import {
  createDiscordEvent,
  updateDiscordEvent,
  deleteDiscordEvent,
  getDiscordEventUrl,
} from '@/lib/discord'
import { formatWeekDate, getWeekDateFromWeekId } from '@/lib/mini-lt/utils'
import type { SerializableWeekData } from '@/lib/firebase'

/**
 * Build event description from week data
 */
function buildEventDescription(data: SerializableWeekData): string {
  if (data.talks.length === 0) {
    return '## 今週のLT発表予定\n\nまだ発表が登録されていません。\nぜひ登録してみましょう！\h詳細はこちらから: https://mini-lt.lumos-ynu.jp'
  }

  const talkList = data.talks
    .sort((a, b) => a.order - b.order)
    .map((talk, idx) => `${idx + 1}. 【${talk.title}】 - ${talk.presenterName}`)
    .join('\n')

  return `## 今週のLT予定\n\n${talkList}\n\n参加お待ちしています！\n詳細はこちらから: https://mini-lt.lumos-ynu.jp`
}

/**
 * Create a Discord event for a specific week
 */
export async function createWeekEvent(weekId: string): Promise<void> {
  // Fetch data inside the server action
  const weekData = await getWeekData(weekId)
  const displayDate = formatWeekDate(weekId)

  // Get Monday date from week ID
  const mondayDate = getWeekDateFromWeekId(weekId)

  // Get year, month, day from the parsed Monday date
  const year_val = mondayDate.getFullYear()
  const month_val = mondayDate.getMonth()
  const day_val = mondayDate.getDate()

  // Create date in UTC representing 21:00 JST (which is 12:00 UTC)
  // JST = UTC+9, so 21:00 JST = 12:00 UTC same day
  const startDateUTC = new Date(Date.UTC(year_val, month_val, day_val, 12, 0, 0))

  // End time: 22:00 JST = 13:00 UTC same day
  const endDateUTC = new Date(Date.UTC(year_val, month_val, day_val, 13, 0, 0))

  const description = buildEventDescription(weekData)

  const event = await createDiscordEvent({
    name: `Lumos Mini LT (${displayDate})`,
    description,
    scheduledStartTime: startDateUTC.toISOString(),
    scheduledEndTime: endDateUTC.toISOString(),
    location: 'Discord ボイスチャンネル',
  })

  const eventUrl = getDiscordEventUrl(event.id)
  await saveDiscordEvent(weekId, event.id, eventUrl)

  revalidatePath('/admin')
  revalidatePath('/')
}

/**
 * Sync event description with current talks
 */
export async function syncWeekEventDescription(weekId: string, eventId: string): Promise<void> {
  // Fetch data inside the server action
  const weekData = await getWeekData(weekId)

  const description = buildEventDescription(weekData)

  await updateDiscordEvent(eventId, {
    description,
  })

  revalidatePath('/admin')
  revalidatePath('/')
}

/**
 * Delete a Discord event
 */
export async function deleteWeekEvent(weekId: string, eventId: string): Promise<void> {
  await deleteDiscordEvent(eventId)
  await removeDiscordEvent(weekId)

  revalidatePath('/admin')
  revalidatePath('/')
}
