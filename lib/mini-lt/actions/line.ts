'use server'

import { revalidatePath } from 'next/cache'
import { getWeekData } from '@/lib/firebase'
import { getNextEventWeekId } from '@/lib/mini-lt/utils'
import { buildNextEventFlexMessage } from '@/lib/mini-lt/line-flex'

export async function sendLineNextEvent(): Promise<void> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const toUserId = process.env.LINE_PUSH_TARGET_ID

  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません')
  }
  if (!toUserId) {
    throw new Error('LINE_PUSH_TARGET_ID が設定されていません')
  }

  const weekId = getNextEventWeekId()
  const weekData = await getWeekData(weekId)

  const lineMessage = buildNextEventFlexMessage(weekId, weekData)

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: toUserId,
      messages: [lineMessage],
    }),
  })

  if (!response.ok) {
    const bodyText = await response.text()
    throw new Error(`LINE メッセージ送信に失敗しました: ${response.status} ${response.statusText} - ${bodyText}`)
  }

  revalidatePath('/admin')
  revalidatePath('/')
}
